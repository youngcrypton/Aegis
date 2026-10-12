// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {AegisVault} from "../../contracts/AegisVault.sol";
import {AegisSentinelRegistry} from "../../contracts/AegisSentinelRegistry.sol";
import {AegisFeeCollector} from "../../contracts/AegisFeeCollector.sol";
import {
    TriggerMode,
    OrderType,
    VaultState,
    ProConfig,
    VaultPosition,
    ActiveHedge,
    SentinelNode
} from "../../contracts/AegisTypes.sol";
import {MockHyperCorePrecompile} from "../mocks/MockHyperCorePrecompile.sol";
import {MockHyperCoreWriter} from "../mocks/MockHyperCoreWriter.sol";
import {MockAscendHookPool} from "../mocks/MockAscendHookPool.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

/**
 * @title EndToEndFlowTest
 * @notice Complete integration smoke test verifying the end-to-end AEGIS Protocol lifecycle:
 *         Deposit Collateral -> Simulate Flash Crash -> Keeper Dispatches Short Hedge ->
 *         Price Rebounds -> Trailing Unwind Executes -> 10% Fee Flywheel (50% Burn / 50% Yield) ->
 *         Vault Restored (H > 1.25) -> Security Invariants INV-1 to INV-5 Verified.
 */
contract EndToEndFlowTest is Test {
    // Core contracts
    AegisVault public vault;
    AegisSentinelRegistry public registry;
    AegisFeeCollector public feeCollector;

    // Mocks & Adapters
    MockHyperCorePrecompile public mockPrecompile;
    MockHyperCoreWriter public mockWriter;
    MockAscendHookPool public mockHookPool;

    // Tokens
    MockERC20 public usdc;
    MockERC20 public hype;
    MockERC20 public aegis;

    // Test Actors & Keys
    address public deployer;
    address public borrower;
    address public sentinelOperator;
    uint256 public sessionKeyPk;
    address public sessionKey;
    address public stakerTarget;

    // Constants
    address public constant PRECOMPILE_0x0801 = address(0x0801);
    address public constant PREDEPLOY_0x0802 = address(0x0802);
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    uint32 public constant PERP_INDEX = 0; // HYPE/USDC market

    function setUp() public {
        deployer = address(this);
        borrower = makeAddr("borrower");
        sentinelOperator = makeAddr("sentinelOperator");
        (sessionKey, sessionKeyPk) = makeAddrAndKey("sessionKey");
        stakerTarget = makeAddr("stakerTarget");

        // 1. Etch 0x0801 Precompile & 0x0802 Predeploy mocks
        mockPrecompile = new MockHyperCorePrecompile();
        vm.etch(PRECOMPILE_0x0801, address(mockPrecompile).code);

        mockWriter = new MockHyperCoreWriter();
        vm.etch(PREDEPLOY_0x0802, address(mockWriter).code);

        // 2. Deploy Test Tokens
        usdc = new MockERC20("USD Coin", "USDC", 6);
        hype = new MockERC20("Hyperliquid HYPE", "HYPE", 18);
        aegis = new MockERC20("AEGIS Governance", "AEGIS", 18);

        // 3. Deploy Ascend Closed Hook Pool (Rate: 10 AEGIS per 1 USDC)
        mockHookPool = new MockAscendHookPool();
        aegis.mint(address(mockHookPool), 1_000_000 ether);

        // 4. Deploy Protocol Core Contracts
        feeCollector = new AegisFeeCollector(
            address(usdc),
            address(aegis),
            address(mockHookPool),
            stakerTarget,
            deployer
        );

        registry = new AegisSentinelRegistry(address(aegis), deployer);
        vault = new AegisVault(deployer);

        // 5. Configure Cross-Contract Authorizations & Linking
        vault.setFeeCollector(address(feeCollector));
        feeCollector.setAuthorizedVault(address(vault), true);
        registry.setAuthorizedSlasher(address(vault), true);

        // 6. Fund Actors
        // Sentinel bonds 25,000 $AEGIS
        aegis.mint(sentinelOperator, 50_000 ether);
        vm.startPrank(sentinelOperator);
        aegis.approve(address(registry), 25_000 ether);
        registry.bondStake(25_000 ether);
        vm.stopPrank();

        // Borrower receives initial assets
        hype.mint(borrower, 1_000 ether);
        usdc.mint(borrower, 100_000 * 1e6);

        // Set initial oracle price: $48.50 (scaled 1e8)
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 48_50000000);
    }

    /**
     * @notice Helper to sign EIP-712 HedgeIntent using session key
     */
    function _signHedgeIntent(
        address vaultOwner,
        uint32 perpIndex,
        int256 size,
        uint256 limitPrice,
        uint256 nonce,
        uint256 deadline
    ) internal view returns (bytes memory) {
        bytes32 digest = vault.hashHedgeIntent(
            vaultOwner,
            perpIndex,
            size,
            limitPrice,
            nonce,
            deadline
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(sessionKeyPk, digest);
        return abi.encodePacked(r, s, v);
    }

    /**
     * @notice Comprehensive end-to-end integration scenario.
     */
    function test_EndToEnd_LifecycleFlow() public {
        console2.log("=== PHASE 1: Deposit Collateral & Configure Pro Parameters ===");

        vm.startPrank(borrower);
        // Register position: 1,000 HYPE, $32,000 USDC debt, 80% maintenance LTV (8000 bps)
        vault.registerPosition(address(hype), 1_000 ether, 32_000 * 1e6, 8000);

        // Configure ProConfig: HYBRID trigger, $44.20 price trigger, H <= 1.10, 50% hedge ratio
        vault.setProConfig(
            ProConfig({
                triggerMode: uint8(TriggerMode.HYBRID),
                orderType: uint8(OrderType.POST_ONLY_LIMIT),
                hedgeRatioBps: 5000, // 50% coverage
                trailingTakeProfitBps: 150, // 1.5% trailing stop
                maxSlippageBps: 50, // 0.5% max slippage
                sessionKeyExpiry: uint48(block.timestamp + 30 days),
                manualOverrideActive: false,
                priceTrigger: 44_20000000, // $44.20
                healthFactorTrigger: 11000 // H <= 1.10
            })
        );

        // Delegate trade-only session key (Invariant INV-1)
        vault.delegateSessionKey(sessionKey, uint48(30 days));

        // Pre-approve FeeCollector for potential performance fee payment
        usdc.approve(address(feeCollector), 10_000 * 1e6);
        vm.stopPrank();

        // Verify initial healthy state: P = $48.50 -> H = (1000 * 48.50 * 0.80) / 32000 = 1.2125 (12125)
        (uint256 initialH, bool initialTriggered, uint256 initialPrice) = vault.getVaultHealth(
            borrower,
            PERP_INDEX
        );
        assertEq(initialPrice, 48_50000000, "Initial mark price mismatch");
        assertEq(initialH, 12125, "Initial health factor must be 1.2125");
        assertFalse(initialTriggered, "Vault should not be triggered in healthy standby");
        console2.log("Healthy Standby: P = $48.50, H = 1.2125");

        // Verify Invariant INV-1: Vault contract custody of collateral is ZERO
        assertEq(hype.balanceOf(address(vault)), 0, "INV-1 Violation: Vault must hold 0 user collateral");
        assertEq(hype.allowance(borrower, sessionKey), 0, "INV-1 Violation: Sentinel allowance must be 0");

        console2.log("=== PHASE 2: Flash Crash Simulates Market Breach ===");

        // Price drops -18% to $43.00: H = (1000 * 43.00 * 0.80) / 32000 = 1.0750 (10750 <= 11000 trigger)
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 43_00000000);

        (uint256 crashH, bool crashTriggered, ) = vault.getVaultHealth(borrower, PERP_INDEX);
        assertEq(crashH, 10750, "Crashed health factor must be 1.0750");
        assertTrue(crashTriggered, "Breach detected: H <= 1.10 trigger must fire");
        console2.log("Market Breach: P = $43.00, H = 1.0750 (Trigger Breached)");

        console2.log("=== PHASE 3: Sentinel Dispatches Autonomous Short Hedge ===");

        // 50% hedge size = 500 HYPE short (negative size)
        int256 hedgeSize = -500 ether;
        uint256 limitPrice = (43_00000000 * 9950) / 10000; // 0.5% slippage bound
        uint256 deadline = block.timestamp + 300;
        uint256 nonce = vault.vaultNonces(borrower);

        bytes memory hedgeSig = _signHedgeIntent(
            borrower,
            PERP_INDEX,
            hedgeSize,
            limitPrice,
            nonce,
            deadline
        );

        // Sentinel keeper calls executeHedgeIntent
        vm.prank(sentinelOperator);
        vault.executeHedgeIntent(
            borrower,
            PERP_INDEX,
            hedgeSize,
            limitPrice,
            deadline,
            hedgeSig
        );

        // Verify active hedge was recorded
        ActiveHedge memory activeHedge = vault.getActiveHedge(borrower);
        assertTrue(activeHedge.isOpen, "Hedge must be open");
        assertEq(activeHedge.size, 500 ether, "Hedge size must be 500 HYPE");
        assertEq(activeHedge.entryPrice, 43_00000000, "Entry price must be $43.00");
        console2.log("Hedge Executed: 500 HYPE short on HyperCore CLOB at $43.00");

        // Verify Invariant INV-5: Nonce incremented monotonically
        assertEq(vault.vaultNonces(borrower), 1, "INV-5 Violation: Nonce must increment to 1");

        console2.log("=== PHASE 4: Market Rebound & Trailing Unwind ===");

        // Price dips to $42.00 trough, then rebounds to $44.00
        // Trailing take-profit target: $42.00 * (1 + 0.015) = $42.63
        // At P = $44.00, rebound crosses exit threshold
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 44_00000000);

        uint256 exitPrice = 42_63000000; // Unwind execution fill price
        uint256 unwindNonce = vault.vaultNonces(borrower);

        bytes memory unwindSig = _signHedgeIntent(
            borrower,
            PERP_INDEX,
            int256(activeHedge.size), // buy-to-close size
            exitPrice,
            unwindNonce,
            deadline
        );

        vm.prank(sentinelOperator);
        vault.executeUnwindIntent(
            borrower,
            PERP_INDEX,
            exitPrice,
            deadline,
            unwindSig
        );

        // Verify hedge is closed
        ActiveHedge memory closedHedge = vault.getActiveHedge(borrower);
        assertFalse(closedHedge.isOpen, "Hedge must be closed after unwind");
        console2.log("Hedge Unwound: 500 HYPE bought-to-close at $42.63 with cash profit");

        console2.log("=== PHASE 5: 50/50 Flywheel Fee Capture & Execution ===");

        // FeeCollector captured 10% performance fee on averted liquidation penalty
        uint256 captured = feeCollector.totalFeesCaptured();
        assertGt(captured, 0, "FeeCollector must have captured performance fees");
        assertEq(
            feeCollector.buybackBudget() + feeCollector.yieldBudget(),
            captured,
            "INV-4 Violation: Fee budgets must sum to captured fees"
        );

        // Execute Buyback & Burn via Ascend Hook Pool (50%)
        uint256 preDeadAegis = aegis.balanceOf(DEAD_ADDRESS);
        feeCollector.executeBuybackAndBurn(0);
        uint256 postDeadAegis = aegis.balanceOf(DEAD_ADDRESS);
        assertGt(postDeadAegis, preDeadAegis, "Ascend Hook Pool must have burned $AEGIS tokens");

        // Distribute Real Yield to Stakers (50%)
        uint256 preYieldUsdc = usdc.balanceOf(stakerTarget);
        feeCollector.distributeYield();
        uint256 postYieldUsdc = usdc.balanceOf(stakerTarget);
        assertGt(postYieldUsdc, preYieldUsdc, "Stakers must have received real yield in USDC");

        console2.log("Flywheel Executed: 50% $AEGIS burned, 50% USDC real yield distributed");

        console2.log("=== PHASE 6: Full Recovery & Security Invariants Verification ===");

        // Market fully recovers to $50.00
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 50_00000000);
        (uint256 recoveredH, , ) = vault.getVaultHealth(borrower, PERP_INDEX);
        assertGe(recoveredH, 12500, "Health factor must be restored above 1.25");
        console2.log("Vault Restored: P = $50.00, H = 1.2500");

        // Verify Invariant INV-2: Sentinel node remains fully bonded (>= 25,000 $AEGIS)
        SentinelNode memory node = registry.getSentinel(sentinelOperator);
        assertTrue(node.isActive, "INV-2: Sentinel node must remain active");
        assertGe(node.bondedAmount, 25_000 ether, "INV-2: Sentinel bond must be >= 25,000 $AEGIS");

        // Verify Invariant INV-3: Manual override killswitch revokes session key atomically
        vm.prank(borrower);
        vault.manualOverride();

        VaultPosition memory finalPos = vault.getPosition(borrower);
        assertEq(finalPos.sessionKey, address(0), "INV-3: Session key must be address(0) after override");

        ProConfig memory finalCfg = vault.getProConfig(borrower);
        assertTrue(finalCfg.manualOverrideActive, "INV-3: manualOverrideActive must be true");

        // Verify Invariant INV-5: Monotonic nonces
        assertEq(vault.vaultNonces(borrower), 2, "INV-5: 2 nonces consumed sequentially");

        console2.log("=== ALL END-TO-END VERIFICATION CHECKS PASSED (INV-1 to INV-5) ===");
    }
}
