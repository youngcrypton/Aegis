// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {AegisVault} from "../../contracts/AegisVault.sol";
import {
    TriggerMode,
    OrderType,
    ProConfig,
    VaultPosition,
    ActiveHedge,
    InvalidHealthTrigger,
    SlippageExceeded,
    SessionKeyExpired,
    OverrideActive,
    ZeroAddress,
    HedgeAlreadyActive,
    TrailingExitNotReached,
    InvalidPrice,
    MismatchedMarketIndex,
    NoOutstandingDebt,
    ZeroRepaymentAmount,
    IntentExpired,
    AmountOverflow,
    InvalidHedgeDirection,
    HedgeSizeExceeded,
    InvalidAmount,
    NoActiveHedge
} from "../../contracts/AegisTypes.sol";
import {MockHyperCorePrecompile} from "../mocks/MockHyperCorePrecompile.sol";
import {MockHyperCoreWriter} from "../mocks/MockHyperCoreWriter.sol";
import {MockERC20} from "../mocks/MockERC20.sol";
import {AegisFeeCollector} from "../../contracts/AegisFeeCollector.sol";
import {MockAscendHookPool} from "../mocks/MockAscendHookPool.sol";
import {IAegisVault} from "../../contracts/interfaces/IAegisVault.sol";

// Test harness extending AegisVault to allow configuring hyperCoreWriter for local tests
contract AegisVaultHarness is AegisVault {
    constructor(address initialOwner, address _writer) AegisVault(initialOwner) {
        _setHyperCoreWriter(_writer);
    }
}

// Mock failing fee collector to test fee failure fallback and debt accrual
contract MockFailingFeeCollector {
    function processAvertedFee(address, uint256) external pure {
        revert("SimulatedFeeFailure");
    }
}

contract AegisVaultTest is Test {
    AegisVaultHarness internal vault;
    MockHyperCorePrecompile internal mockPrecompile;
    MockHyperCoreWriter internal mockWriter;
    MockERC20 internal mockCollateral;

    address internal owner = address(0xAA1);
    address internal borrower = address(0xBB2);

    uint256 internal sessionKeyPrivateKey = 0x5E5510;
    address internal sessionKeyAddress;

    address internal constant PRECOMPILE_0x0801 = address(0x0801);
    uint32 internal constant PERP_INDEX = 0; // HYPE-PERP

    function setUp() public {
        sessionKeyAddress = vm.addr(sessionKeyPrivateKey);

        mockPrecompile = new MockHyperCorePrecompile();
        mockWriter = new MockHyperCoreWriter();
        mockCollateral = new MockERC20("Collateral Token", "COL", 18);

        // Etch precompile 0x0801
        vm.etch(PRECOMPILE_0x0801, address(mockPrecompile).code);

        // Deploy vault harness pointing to mock writer
        vault = new AegisVaultHarness(owner, address(mockWriter));

        // Default mark price = $40.00 (scaled 1e8)
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 40_00000000);
    }

    function _signHedge(
        uint256 privateKey,
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
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function test_RegisterPosition_Success() public {
        vm.prank(borrower);
        vault.registerPosition(
            address(mockCollateral),
            100 ether,       // 100 tokens
            2_000 * 1e6,     // $2,000 USDC debt
            8000             // 80% LTV threshold
        );

        VaultPosition memory pos = vault.getPosition(borrower);
        assertEq(pos.owner, borrower);
        assertEq(pos.collateralToken, address(mockCollateral));
        assertEq(pos.collateralAmount, 100 ether);
        assertEq(pos.debtAmountUsdc, 2_000 * 1e6);
        assertEq(pos.liquidationThresholdBps, 8000);
    }

    function test_SetProConfig_BoundsValidation() public {
        ProConfig memory validConfig = ProConfig({
            triggerMode: uint8(TriggerMode.HEALTH_FACTOR),
            orderType: uint8(OrderType.POST_ONLY_LIMIT),
            hedgeRatioBps: 5000,          // 50%
            trailingTakeProfitBps: 150,   // 1.5%
            maxSlippageBps: 50,           // 0.5%
            sessionKeyExpiry: 0,
            manualOverrideActive: false,
            priceTrigger: 0,
            healthFactorTrigger: 11000    // 1.10
        });

        vm.prank(borrower);
        vault.setProConfig(validConfig);

        ProConfig memory saved = vault.getProConfig(borrower);
        assertEq(saved.hedgeRatioBps, 5000);
        assertEq(saved.healthFactorTrigger, 11000);

        // Invalid health factor trigger (< 10200)
        validConfig.healthFactorTrigger = 10100;
        vm.prank(borrower);
        vm.expectRevert(InvalidHealthTrigger.selector);
        vault.setProConfig(validConfig);

        // Invalid hedge ratio (< 1000)
        validConfig.healthFactorTrigger = 11000;
        validConfig.hedgeRatioBps = 500;
        vm.prank(borrower);
        vm.expectRevert(InvalidHealthTrigger.selector);
        vault.setProConfig(validConfig);

        // Invalid slippage (> 100)
        validConfig.hedgeRatioBps = 5000;
        validConfig.maxSlippageBps = 150;
        vm.prank(borrower);
        vm.expectRevert(SlippageExceeded.selector);
        vault.setProConfig(validConfig);
    }

    function test_DelegateAndRevokeSessionKey() public {
        vm.startPrank(borrower);
        vault.delegateSessionKey(sessionKeyAddress, 7 days);

        VaultPosition memory pos = vault.getPosition(borrower);
        assertEq(pos.sessionKey, sessionKeyAddress);
        assertEq(vault.getProConfig(borrower).sessionKeyExpiry, uint48(block.timestamp + 7 days));

        vault.revokeSessionKey();
        pos = vault.getPosition(borrower);
        assertEq(pos.sessionKey, address(0));
        assertEq(vault.getProConfig(borrower).sessionKeyExpiry, 0);
        vm.stopPrank();
    }

    function test_ManualOverride_InvariantINV3_AtomicKillswitch() public {
        vm.startPrank(borrower);
        vault.registerPosition(address(mockCollateral), 100 ether, 2_000 * 1e6, 8000);
        vault.delegateSessionKey(sessionKeyAddress, 7 days);

        // Invariant INV-3: Call manual override
        vault.manualOverride();
        vm.stopPrank();

        // Check atomic revocation in the same block
        assertTrue(vault.getProConfig(borrower).manualOverrideActive);
        assertEq(vault.getPosition(borrower).sessionKey, address(0));
        assertEq(vault.getProConfig(borrower).sessionKeyExpiry, 0);

        // Any subsequent keeper executeHedgeIntent must revert with OverrideActive
        bytes memory dummySig = hex"1234";
        vm.expectRevert(OverrideActive.selector);
        vault.executeHedgeIntent(
            borrower,
            PERP_INDEX,
            -50 ether,
            30_00000000,
            block.timestamp + 1 hours,
            dummySig
        );
    }

    function test_ExecuteHedgeIntent_BreachTriggerAndHedge() public {
        // Setup: 100 collateral at $40 = $4,000. 80% LTV threshold = $3,200.
        // Debt = $3,000. Current H = 3200 / 3000 = 1.0667 (10667)
        vm.startPrank(borrower);
        vault.registerPosition(address(mockCollateral), 100 ether, 3_000 * 1e6, 8000);
        vault.setProConfig(ProConfig({
            triggerMode: uint8(TriggerMode.HEALTH_FACTOR),
            orderType: uint8(OrderType.POST_ONLY_LIMIT),
            hedgeRatioBps: 10000,
            trailingTakeProfitBps: 200, // 2%
            maxSlippageBps: 50,
            sessionKeyExpiry: 0,
            manualOverrideActive: false,
            priceTrigger: 0,
            healthFactorTrigger: 11000  // Trigger at H <= 1.10
        }));
        vault.delegateSessionKey(sessionKeyAddress, 7 days);
        vm.stopPrank();

        // Check health factor: H = 10666 <= 11000 -> Triggered!
        (uint256 h, bool isTriggered, ) = vault.getVaultHealth(borrower, PERP_INDEX);
        assertTrue(isTriggered, "Vault health should be triggered");
        assertLe(h, 11000);

        int256 hedgeSize = -100 ether;
        uint256 limitPrice = 39_80000000;
        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = vault.vaultNonces(borrower);

        bytes memory signature = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            hedgeSize,
            limitPrice,
            nonce,
            deadline
        );

        vault.executeHedgeIntent(
            borrower,
            PERP_INDEX,
            hedgeSize,
            limitPrice,
            deadline,
            signature
        );

        ActiveHedge memory hedge = vault.getActiveHedge(borrower);
        assertTrue(hedge.isOpen, "Hedge should be open");
        assertEq(hedge.size, 100 ether);
        assertEq(hedge.entryPrice, 40_00000000);
        assertEq(mockWriter.getRecordedIntentsCount(), 1);
    }

    function test_ExecuteHedgeIntent_NotTriggeredReverts() public {
        // Safe vault: 100 tokens at $40 = $4,000. Debt = $1,000. H = 3.20 (32000)
        vm.startPrank(borrower);
        vault.registerPosition(address(mockCollateral), 100 ether, 1_000 * 1e6, 8000);
        vault.setProConfig(ProConfig({
            triggerMode: uint8(TriggerMode.HEALTH_FACTOR),
            orderType: uint8(OrderType.POST_ONLY_LIMIT),
            hedgeRatioBps: 10000,
            trailingTakeProfitBps: 200,
            maxSlippageBps: 50,
            sessionKeyExpiry: 0,
            manualOverrideActive: false,
            priceTrigger: 0,
            healthFactorTrigger: 11000
        }));
        vault.delegateSessionKey(sessionKeyAddress, 7 days);
        vm.stopPrank();

        bytes memory signature = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            -10 ether,
            39_80000000,
            0,
            block.timestamp + 1 hours
        );

        vm.expectRevert(InvalidHealthTrigger.selector);
        vault.executeHedgeIntent(
            borrower,
            PERP_INDEX,
            -10 ether,
            39_80000000,
            block.timestamp + 1 hours,
            signature
        );
    }

    function test_ExecuteUnwindIntent_Success() public {
        // Open hedge first
        vm.startPrank(borrower);
        vault.registerPosition(address(mockCollateral), 100 ether, 3_000 * 1e6, 8000);
        vault.setProConfig(ProConfig({
            triggerMode: uint8(TriggerMode.HEALTH_FACTOR),
            orderType: uint8(OrderType.POST_ONLY_LIMIT),
            hedgeRatioBps: 10000,
            trailingTakeProfitBps: 200,
            maxSlippageBps: 50,
            sessionKeyExpiry: 0,
            manualOverrideActive: false,
            priceTrigger: 0,
            healthFactorTrigger: 11000
        }));
        vault.delegateSessionKey(sessionKeyAddress, 7 days);
        vm.stopPrank();

        bytes memory signatureHedge = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            -100 ether,
            39_80000000,
            0,
            block.timestamp + 1 hours
        );

        vault.executeHedgeIntent(
            borrower,
            PERP_INDEX,
            -100 ether,
            39_80000000,
            block.timestamp + 1 hours,
            signatureHedge
        );

        // Now unwind hedge: market rebounds to $42.00
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 42_00000000);

        uint256 unwindNonce = vault.vaultNonces(borrower);
        uint256 exitPrice = 42_00000000;
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory signatureUnwind = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            100 ether,
            exitPrice,
            unwindNonce,
            deadline
        );

        vault.executeUnwindIntent(
            borrower,
            PERP_INDEX,
            exitPrice,
            deadline,
            signatureUnwind
        );

        ActiveHedge memory hedge = vault.getActiveHedge(borrower);
        assertFalse(hedge.isOpen, "Hedge should be closed post-unwind");
        assertEq(mockWriter.getRecordedIntentsCount(), 2, "Both hedge and unwind intents recorded");
    }

    // ==========================================
    // TASK 2: DOUBLE-HEDGE OVERWRITE PROTECTION
    // ==========================================

    function test_ExecuteHedgeIntent_RevertIfAlreadyActive() public {
        // Setup breached vault
        vm.startPrank(borrower);
        vault.registerPosition(address(mockCollateral), 100 ether, 3_000 * 1e6, 8000);
        vault.setProConfig(ProConfig({
            triggerMode: uint8(TriggerMode.HEALTH_FACTOR),
            orderType: uint8(OrderType.POST_ONLY_LIMIT),
            hedgeRatioBps: 10000,
            trailingTakeProfitBps: 200,
            maxSlippageBps: 50,
            sessionKeyExpiry: 0,
            manualOverrideActive: false,
            priceTrigger: 0,
            healthFactorTrigger: 11000
        }));
        vault.delegateSessionKey(sessionKeyAddress, 7 days);
        vm.stopPrank();

        // 1. Open first hedge
        int256 firstHedgeSize = -50 ether;
        bytes memory sig1 = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            firstHedgeSize,
            39_80000000,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );

        vault.executeHedgeIntent(
            borrower,
            PERP_INDEX,
            firstHedgeSize,
            39_80000000,
            block.timestamp + 1 hours,
            sig1
        );

        ActiveHedge memory hedge = vault.getActiveHedge(borrower);
        assertTrue(hedge.isOpen, "First hedge must be active");
        assertEq(hedge.size, 50 ether);
        assertEq(mockWriter.getRecordedIntentsCount(), 1);

        // 2. Attempt second hedge while first is still open -> MUST REVERT with HedgeAlreadyActive
        int256 secondHedgeSize = -100 ether;
        bytes memory sig2 = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            secondHedgeSize,
            38_00000000,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );

        vm.expectRevert(HedgeAlreadyActive.selector);
        vault.executeHedgeIntent(
            borrower,
            PERP_INDEX,
            secondHedgeSize,
            38_00000000,
            block.timestamp + 1 hours,
            sig2
        );

        // 3. Verify original hedge record was NOT overwritten or corrupted
        ActiveHedge memory hedgeAfter = vault.getActiveHedge(borrower);
        assertTrue(hedgeAfter.isOpen);
        assertEq(hedgeAfter.size, 50 ether, "Size must remain original 50 ether");
        assertEq(hedgeAfter.entryPrice, 40_00000000);
        assertEq(mockWriter.getRecordedIntentsCount(), 1, "No second order dispatched to writer");
    }

    function test_ExecuteHedgeIntent_CanOpenAfterValidUnwind() public {
        // Setup breached vault
        vm.startPrank(borrower);
        vault.registerPosition(address(mockCollateral), 100 ether, 3_000 * 1e6, 8000);
        vault.setProConfig(ProConfig({
            triggerMode: uint8(TriggerMode.HEALTH_FACTOR),
            orderType: uint8(OrderType.POST_ONLY_LIMIT),
            hedgeRatioBps: 10000,
            trailingTakeProfitBps: 200,
            maxSlippageBps: 50,
            sessionKeyExpiry: 0,
            manualOverrideActive: false,
            priceTrigger: 0,
            healthFactorTrigger: 11000
        }));
        vault.delegateSessionKey(sessionKeyAddress, 7 days);
        vm.stopPrank();

        // 1. Open hedge 1
        bytes memory sigHedge1 = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            -50 ether,
            39_80000000,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );
        vault.executeHedgeIntent(
            borrower,
            PERP_INDEX,
            -50 ether,
            39_80000000,
            block.timestamp + 1 hours,
            sigHedge1
        );
        assertTrue(vault.getActiveHedge(borrower).isOpen);

        // 2. Market rebounds to $42.00, unwind hedge 1
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 42_00000000);
        bytes memory sigUnwind = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            50 ether,
            42_00000000,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );
        vault.executeUnwindIntent(
            borrower,
            PERP_INDEX,
            42_00000000,
            block.timestamp + 1 hours,
            sigUnwind
        );
        assertFalse(vault.getActiveHedge(borrower).isOpen, "Hedge must be closed");

        // 3. New flash crash occurs: price drops to $38.00 (breaching trigger again)
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 38_00000000);

        // 4. Opening hedge 2 must now succeed!
        bytes memory sigHedge2 = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            -75 ether,
            37_50000000,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );
        vault.executeHedgeIntent(
            borrower,
            PERP_INDEX,
            -75 ether,
            37_50000000,
            block.timestamp + 1 hours,
            sigHedge2
        );

        ActiveHedge memory hedge2 = vault.getActiveHedge(borrower);
        assertTrue(hedge2.isOpen, "Hedge 2 must be open");
        assertEq(hedge2.size, 75 ether);
        assertEq(hedge2.entryPrice, 38_00000000);
    }

    function test_ExecuteHedgeIntent_FailedAttemptDoesNotCorruptHedge() public {
        vm.startPrank(borrower);
        vault.registerPosition(address(mockCollateral), 100 ether, 3_000 * 1e6, 8000);
        vault.setProConfig(ProConfig({
            triggerMode: uint8(TriggerMode.HEALTH_FACTOR),
            orderType: uint8(OrderType.POST_ONLY_LIMIT),
            hedgeRatioBps: 10000,
            trailingTakeProfitBps: 200,
            maxSlippageBps: 50,
            sessionKeyExpiry: 0,
            manualOverrideActive: false,
            priceTrigger: 0,
            healthFactorTrigger: 11000
        }));
        vault.delegateSessionKey(sessionKeyAddress, 7 days);
        vm.stopPrank();

        bytes memory validSig = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            -50 ether,
            39_80000000,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );
        vault.executeHedgeIntent(
            borrower,
            PERP_INDEX,
            -50 ether,
            39_80000000,
            block.timestamp + 1 hours,
            validSig
        );

        // Invalid signature attempt
        bytes memory badSig = hex"112233445566";
        vm.expectRevert();
        vault.executeHedgeIntent(
            borrower,
            PERP_INDEX,
            -100 ether,
            35_00000000,
            block.timestamp + 1 hours,
            badSig
        );

        // State remains pristine
        ActiveHedge memory hedge = vault.getActiveHedge(borrower);
        assertTrue(hedge.isOpen);
        assertEq(hedge.size, 50 ether);
    }

    // ==========================================
    // TASK 3: UNWIND PRICE & FEE VALIDATION
    // ==========================================

    function test_ExecuteUnwindIntent_RevertIfTrailingNotReached() public {
        vm.startPrank(borrower);
        vault.registerPosition(address(mockCollateral), 100 ether, 3_000 * 1e6, 8000);
        vault.setProConfig(ProConfig({
            triggerMode: uint8(TriggerMode.HEALTH_FACTOR),
            orderType: uint8(OrderType.POST_ONLY_LIMIT),
            hedgeRatioBps: 10000,
            trailingTakeProfitBps: 200, // 2% -> trailingExitPrice = $40.00 * 1.02 = $40.80
            maxSlippageBps: 50,
            sessionKeyExpiry: 0,
            manualOverrideActive: false,
            priceTrigger: 0,
            healthFactorTrigger: 11000
        }));
        vault.delegateSessionKey(sessionKeyAddress, 7 days);
        vm.stopPrank();

        bytes memory sigHedge = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            -100 ether,
            39_80000000,
            0,
            block.timestamp + 1 hours
        );
        vault.executeHedgeIntent(borrower, PERP_INDEX, -100 ether, 39_80000000, block.timestamp + 1 hours, sigHedge);

        // Price has only risen to $40.50 (less than trailing target $40.80)
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 40_50000000);

        bytes memory sigUnwind = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            100 ether,
            40_50000000,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );

        // Must revert with TrailingExitNotReached
        vm.expectRevert(
            abi.encodeWithSelector(TrailingExitNotReached.selector, 40_50000000, 40_80000000)
        );
        vault.executeUnwindIntent(
            borrower,
            PERP_INDEX,
            40_50000000,
            block.timestamp + 1 hours,
            sigUnwind
        );
    }

    function test_ExecuteUnwindIntent_RevertOnZeroPrice() public {
        vm.startPrank(borrower);
        vault.registerPosition(address(mockCollateral), 100 ether, 3_000 * 1e6, 8000);
        vault.setProConfig(ProConfig({
            triggerMode: uint8(TriggerMode.HEALTH_FACTOR),
            orderType: uint8(OrderType.POST_ONLY_LIMIT),
            hedgeRatioBps: 10000,
            trailingTakeProfitBps: 200,
            maxSlippageBps: 50,
            sessionKeyExpiry: 0,
            manualOverrideActive: false,
            priceTrigger: 0,
            healthFactorTrigger: 11000
        }));
        vault.delegateSessionKey(sessionKeyAddress, 7 days);
        vm.stopPrank();

        bytes memory sigHedge = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            -100 ether,
            39_80000000,
            0,
            block.timestamp + 1 hours
        );
        vault.executeHedgeIntent(borrower, PERP_INDEX, -100 ether, 39_80000000, block.timestamp + 1 hours, sigHedge);

        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 42_00000000);

        bytes memory sigUnwind = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            100 ether,
            0,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );

        vm.expectRevert(InvalidPrice.selector);
        vault.executeUnwindIntent(
            borrower,
            PERP_INDEX,
            0,
            block.timestamp + 1 hours,
            sigUnwind
        );
    }

    function test_ExecuteUnwindIntent_RevertOnMismatchedMarket() public {
        vm.startPrank(borrower);
        vault.registerPosition(address(mockCollateral), 100 ether, 3_000 * 1e6, 8000);
        vault.setProConfig(ProConfig({
            triggerMode: uint8(TriggerMode.HEALTH_FACTOR),
            orderType: uint8(OrderType.POST_ONLY_LIMIT),
            hedgeRatioBps: 10000,
            trailingTakeProfitBps: 200,
            maxSlippageBps: 50,
            sessionKeyExpiry: 0,
            manualOverrideActive: false,
            priceTrigger: 0,
            healthFactorTrigger: 11000
        }));
        vault.delegateSessionKey(sessionKeyAddress, 7 days);
        vm.stopPrank();

        bytes memory sigHedge = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            -100 ether,
            39_80000000,
            0,
            block.timestamp + 1 hours
        );
        vault.executeHedgeIntent(borrower, PERP_INDEX, -100 ether, 39_80000000, block.timestamp + 1 hours, sigHedge);

        bytes memory sigUnwind = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            1, // Wrong perp market
            100 ether,
            42_00000000,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );

        vm.expectRevert(MismatchedMarketIndex.selector);
        vault.executeUnwindIntent(
            borrower,
            1,
            42_00000000,
            block.timestamp + 1 hours,
            sigUnwind
        );
    }

    function test_ExecuteUnwindIntent_RevertOnExcessiveSlippage() public {
        vm.startPrank(borrower);
        vault.registerPosition(address(mockCollateral), 100 ether, 3_000 * 1e6, 8000);
        vault.setProConfig(ProConfig({
            triggerMode: uint8(TriggerMode.HEALTH_FACTOR),
            orderType: uint8(OrderType.POST_ONLY_LIMIT),
            hedgeRatioBps: 10000,
            trailingTakeProfitBps: 200,
            maxSlippageBps: 50, // 0.5% max slippage
            sessionKeyExpiry: 0,
            manualOverrideActive: false,
            priceTrigger: 0,
            healthFactorTrigger: 11000
        }));
        vault.delegateSessionKey(sessionKeyAddress, 7 days);
        vm.stopPrank();

        bytes memory sigHedge = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            -100 ether,
            39_80000000,
            0,
            block.timestamp + 1 hours
        );
        vault.executeHedgeIntent(borrower, PERP_INDEX, -100 ether, 39_80000000, block.timestamp + 1 hours, sigHedge);

        // Rebound mark price = $42.00. Max buy limit allowed = $42.00 * 1.005 = $42.21
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 42_00000000);

        // Keeper attempts exit with limitPrice = $43.00 (> $42.21)
        uint256 excessiveExitPrice = 43_00000000;
        bytes memory sigUnwind = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            100 ether,
            excessiveExitPrice,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );

        vm.expectRevert(SlippageExceeded.selector);
        vault.executeUnwindIntent(
            borrower,
            PERP_INDEX,
            excessiveExitPrice,
            block.timestamp + 1 hours,
            sigUnwind
        );
    }

    function test_UpdateLowestWick_RatchetsTrailingTarget() public {
        vm.startPrank(borrower);
        vault.registerPosition(address(mockCollateral), 100 ether, 3_000 * 1e6, 8000);
        vault.setProConfig(ProConfig({
            triggerMode: uint8(TriggerMode.HEALTH_FACTOR),
            orderType: uint8(OrderType.POST_ONLY_LIMIT),
            hedgeRatioBps: 10000,
            trailingTakeProfitBps: 200, // 2%
            maxSlippageBps: 50,
            sessionKeyExpiry: 0,
            manualOverrideActive: false,
            priceTrigger: 0,
            healthFactorTrigger: 11000
        }));
        vault.delegateSessionKey(sessionKeyAddress, 7 days);
        vm.stopPrank();

        // 1. Open hedge at $40.00
        bytes memory sigHedge = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            -100 ether,
            39_80000000,
            0,
            block.timestamp + 1 hours
        );
        vault.executeHedgeIntent(borrower, PERP_INDEX, -100 ether, 39_80000000, block.timestamp + 1 hours, sigHedge);

        ActiveHedge memory h1 = vault.getActiveHedge(borrower);
        assertEq(h1.lowestWickPrice, 40_00000000);
        assertEq(h1.trailingExitPrice, 40_80000000);

        // 2. Price plunges further to $35.00
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 35_00000000);

        // 3. Call updateLowestWick
        vault.updateLowestWick(borrower);

        ActiveHedge memory h2 = vault.getActiveHedge(borrower);
        assertEq(h2.lowestWickPrice, 35_00000000, "Lowest wick must ratchet down to $35.00");
        // New trailing exit = $35.00 * 1.02 = $35.70
        assertEq(h2.trailingExitPrice, 35_70000000, "Trailing exit must ratchet down to $35.70");

        // 4. Market rebounds to $36.00 (above $35.70, but still well below original $40.80!)
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 36_00000000);

        uint256 exitPrice = 36_00000000;
        bytes memory sigUnwind = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            100 ether,
            exitPrice,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );

        // Unwind succeeds at ratcheted price!
        vault.executeUnwindIntent(
            borrower,
            PERP_INDEX,
            exitPrice,
            block.timestamp + 1 hours,
            sigUnwind
        );

        assertFalse(vault.getActiveHedge(borrower).isOpen, "Hedge closed via ratcheted trailing target");
    }

    // =========================================================================
    // PHASE 1C: UNWIND FEE COLLECTION & OBSERVABILITY TESTS
    // =========================================================================

    function _setupOpenHedge() internal {
        vm.prank(borrower);
        vault.registerPosition(address(mockCollateral), 100 ether, 2_000 * 1e6, 8000);

        vm.prank(borrower);
        vault.setProConfig(
            ProConfig({
                triggerMode: uint8(TriggerMode.PRICE),
                orderType: uint8(OrderType.POST_ONLY_LIMIT),
                hedgeRatioBps: 10000,
                trailingTakeProfitBps: 200, // 2%
                maxSlippageBps: 100, // 1%
                sessionKeyExpiry: uint48(block.timestamp + 30 days),
                manualOverrideActive: false,
                priceTrigger: 45_00000000,
                healthFactorTrigger: 11000
            })
        );
        vm.prank(borrower);
        vault.delegateSessionKey(sessionKeyAddress, 30 days);

        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 40_00000000);

        bytes memory sigHedge = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            -100 ether,
            39_80000000,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );
        vault.executeHedgeIntent(borrower, PERP_INDEX, -100 ether, 39_80000000, block.timestamp + 1 hours, sigHedge);
        assertTrue(vault.getActiveHedge(borrower).isOpen);
    }

    function test_ExecuteUnwindIntent_FeeCollection_SuccessWhenApproved() public {
        _setupOpenHedge();

        MockERC20 usdc = new MockERC20("USD Coin", "USDC", 6);
        MockERC20 aegis = new MockERC20("Aegis", "AEGIS", 18);
        MockAscendHookPool pool = new MockAscendHookPool();
        AegisFeeCollector collector = new AegisFeeCollector(
            address(usdc),
            address(aegis),
            address(pool),
            address(0xDD4),
            owner
        );

        vm.startPrank(owner);
        vault.setFeeCollector(address(collector));
        collector.setAuthorizedVault(address(vault), true);
        vm.stopPrank();

        // Borrower approves collector and holds USDC
        usdc.mint(borrower, 10_000 * 1e6);
        vm.prank(borrower);
        usdc.approve(address(collector), type(uint256).max);

        // Rebound to $42.00
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 42_00000000);
        uint256 exitPrice = 42_00000000;
        bytes memory sigUnwind = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            100 ether,
            exitPrice,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );

        vault.executeUnwindIntent(
            borrower,
            PERP_INDEX,
            exitPrice,
            block.timestamp + 1 hours,
            sigUnwind
        );

        assertFalse(vault.getActiveHedge(borrower).isOpen, "Hedge must be closed");
        assertGt(collector.totalFeesCaptured(), 0, "Fee must be collected");
        assertGt(collector.buybackBudget(), 0, "Buyback budget must be credited");
        assertGt(collector.yieldBudget(), 0, "Yield budget must be credited");
        assertEq(
            collector.buybackBudget() + collector.yieldBudget(),
            collector.totalFeesCaptured(),
            "INV-4 50/50 exact conservation"
        );
    }

    function test_ExecuteUnwindIntent_FeeCollection_FailsGracefullyWhenMissingApproval() public {
        _setupOpenHedge();

        MockERC20 usdc = new MockERC20("USD Coin", "USDC", 6);
        MockERC20 aegis = new MockERC20("Aegis", "AEGIS", 18);
        MockAscendHookPool pool = new MockAscendHookPool();
        AegisFeeCollector collector = new AegisFeeCollector(
            address(usdc),
            address(aegis),
            address(pool),
            address(0xDD4),
            owner
        );

        vm.startPrank(owner);
        vault.setFeeCollector(address(collector));
        collector.setAuthorizedVault(address(vault), true);
        vm.stopPrank();

        // Borrower holds USDC, but has ZERO allowance approved
        usdc.mint(borrower, 10_000 * 1e6);

        // Rebound to $42.00
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 42_00000000);
        uint256 exitPrice = 42_00000000;
        bytes memory sigUnwind = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            100 ether,
            exitPrice,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );

        // Expect FeeCollectionFailed and FeeDebtAccrued events on vault
        vm.expectEmit(true, false, false, false);
        emit IAegisVault.FeeCollectionFailed(borrower, 0, "");
        vm.expectEmit(true, false, false, true);
        emit IAegisVault.FeeDebtAccrued(borrower, 21 * 1e6, 21 * 1e6);

        vault.executeUnwindIntent(
            borrower,
            PERP_INDEX,
            exitPrice,
            block.timestamp + 1 hours,
            sigUnwind
        );

        // Safety-critical unwind must succeed even though fee was not collected
        assertFalse(vault.getActiveHedge(borrower).isOpen, "Hedge must close safely despite missing fee approval");
        assertEq(collector.totalFeesCaptured(), 0, "Zero fees collected");
        assertEq(vault.getFeeDebt(borrower), 21 * 1e6, "Exact fee debt must accrue on missing approval");
    }

    function test_ExecuteUnwindIntent_FeeCollection_FailsGracefullyWhenInsufficientBalance() public {
        _setupOpenHedge();

        MockERC20 usdc = new MockERC20("USD Coin", "USDC", 6);
        MockERC20 aegis = new MockERC20("Aegis", "AEGIS", 18);
        MockAscendHookPool pool = new MockAscendHookPool();
        AegisFeeCollector collector = new AegisFeeCollector(
            address(usdc),
            address(aegis),
            address(pool),
            address(0xDD4),
            owner
        );

        vm.startPrank(owner);
        vault.setFeeCollector(address(collector));
        collector.setAuthorizedVault(address(vault), true);
        vm.stopPrank();

        // Borrower approves max, but holds ZERO balance
        vm.prank(borrower);
        usdc.approve(address(collector), type(uint256).max);

        // Rebound to $42.00
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 42_00000000);
        uint256 exitPrice = 42_00000000;
        bytes memory sigUnwind = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            100 ether,
            exitPrice,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );

        vm.expectEmit(true, false, false, false);
        emit IAegisVault.FeeCollectionFailed(borrower, 0, "");
        vm.expectEmit(true, false, false, true);
        emit IAegisVault.FeeDebtAccrued(borrower, 21 * 1e6, 21 * 1e6);

        vault.executeUnwindIntent(
            borrower,
            PERP_INDEX,
            exitPrice,
            block.timestamp + 1 hours,
            sigUnwind
        );

        assertFalse(vault.getActiveHedge(borrower).isOpen, "Hedge must close safely");
        assertEq(collector.totalFeesCaptured(), 0);
        assertEq(vault.getFeeDebt(borrower), 21 * 1e6, "Exact fee debt must accrue on insufficient balance");
    }

    function test_ExecuteUnwindIntent_FeeCollection_FailsGracefullyWhenFeeCollectorReverts() public {
        _setupOpenHedge();

        MockERC20 usdc = new MockERC20("USD Coin", "USDC", 6);
        MockERC20 aegis = new MockERC20("Aegis", "AEGIS", 18);
        MockAscendHookPool pool = new MockAscendHookPool();
        AegisFeeCollector collector = new AegisFeeCollector(
            address(usdc),
            address(aegis),
            address(pool),
            address(0xDD4),
            owner
        );

        // Configure fee collector on vault, but do NOT authorize vault on collector!
        vm.prank(owner);
        vault.setFeeCollector(address(collector));

        usdc.mint(borrower, 10_000 * 1e6);
        vm.prank(borrower);
        usdc.approve(address(collector), type(uint256).max);

        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 42_00000000);
        uint256 exitPrice = 42_00000000;
        bytes memory sigUnwind = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            100 ether,
            exitPrice,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );

        vm.expectEmit(true, false, false, false);
        emit IAegisVault.FeeCollectionFailed(borrower, 0, "");
        vm.expectEmit(true, false, false, true);
        emit IAegisVault.FeeDebtAccrued(borrower, 21 * 1e6, 21 * 1e6);

        vault.executeUnwindIntent(
            borrower,
            PERP_INDEX,
            exitPrice,
            block.timestamp + 1 hours,
            sigUnwind
        );

        assertFalse(vault.getActiveHedge(borrower).isOpen, "Unwind succeeds despite collector revert");
        assertEq(collector.totalFeesCaptured(), 0);
        assertEq(vault.getFeeDebt(borrower), 21 * 1e6, "Exact fee debt must accrue on collector revert");
    }

    function test_ExecuteUnwindIntent_FeeDebt_AccruesExactDebtWhenInsufficientAllowance() public {
        _setupOpenHedge();

        MockERC20 usdc = new MockERC20("USD Coin", "USDC", 6);
        MockERC20 aegis = new MockERC20("Aegis", "AEGIS", 18);
        MockAscendHookPool pool = new MockAscendHookPool();
        AegisFeeCollector collector = new AegisFeeCollector(
            address(usdc),
            address(aegis),
            address(pool),
            address(0xDD4),
            owner
        );

        vm.startPrank(owner);
        vault.setFeeCollector(address(collector));
        collector.setAuthorizedVault(address(vault), true);
        vm.stopPrank();

        usdc.mint(borrower, 10_000 * 1e6);
        // Only approve 10 USDC when fee is 21 USDC
        vm.prank(borrower);
        usdc.approve(address(collector), 10 * 1e6);

        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 42_00000000);
        uint256 exitPrice = 42_00000000;
        bytes memory sigUnwind = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            100 ether,
            exitPrice,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );

        vault.executeUnwindIntent(
            borrower,
            PERP_INDEX,
            exitPrice,
            block.timestamp + 1 hours,
            sigUnwind
        );

        assertFalse(vault.getActiveHedge(borrower).isOpen, "Unwind succeeds");
        assertEq(collector.totalFeesCaptured(), 0, "No fees captured on partial allowance fail");
        assertEq(vault.getFeeDebt(borrower), 21 * 1e6, "Exact debt recorded on partial allowance fail");
    }

    function test_FeeDebt_RepayPartialAndFull_SucceedsWithExactAccounting() public {
        _setupOpenHedge();

        MockERC20 usdc = new MockERC20("USD Coin", "USDC", 6);
        MockERC20 aegis = new MockERC20("Aegis", "AEGIS", 18);
        MockAscendHookPool pool = new MockAscendHookPool();
        AegisFeeCollector collector = new AegisFeeCollector(
            address(usdc),
            address(aegis),
            address(pool),
            address(0xDD4),
            owner
        );

        vm.startPrank(owner);
        vault.setFeeCollector(address(collector));
        collector.setAuthorizedVault(address(vault), true);
        vm.stopPrank();

        // Borrower has no allowance initially -> triggers debt
        usdc.mint(borrower, 10_000 * 1e6);

        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 42_00000000);
        uint256 exitPrice = 42_00000000;
        bytes memory sigUnwind = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            100 ether,
            exitPrice,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );

        vault.executeUnwindIntent(
            borrower,
            PERP_INDEX,
            exitPrice,
            block.timestamp + 1 hours,
            sigUnwind
        );

        assertEq(vault.getFeeDebt(borrower), 21 * 1e6, "Debt accrued: 21 USDC");

        // 1. Partial Repayment: Repay 10 USDC
        vm.startPrank(borrower);
        usdc.approve(address(collector), 10 * 1e6);

        vm.expectEmit(true, true, false, true);
        emit IAegisVault.FeeDebtRepaid(borrower, borrower, 10 * 1e6, 11 * 1e6);
        uint256 repaid1 = vault.repayFeeDebt(10 * 1e6);
        vm.stopPrank();

        assertEq(repaid1, 10 * 1e6, "Repaid 10 USDC");
        assertEq(vault.getFeeDebt(borrower), 11 * 1e6, "Remaining debt is 11 USDC");
        assertEq(collector.totalFeesCaptured(), 10 * 1e6);
        assertEq(collector.buybackBudget(), 5 * 1e6);
        assertEq(collector.yieldBudget(), 5 * 1e6);

        // 2. Full Repayment with Excess Amount: Request 50 USDC repayment when only 11 USDC is owed
        vm.startPrank(borrower);
        usdc.approve(address(collector), 50 * 1e6);

        vm.expectEmit(true, true, false, true);
        emit IAegisVault.FeeDebtRepaid(borrower, borrower, 11 * 1e6, 0);
        uint256 repaid2 = vault.repayFeeDebt(50 * 1e6);
        vm.stopPrank();

        assertEq(repaid2, 11 * 1e6, "Should only repay outstanding debt of 11 USDC");
        assertEq(vault.getFeeDebt(borrower), 0, "Debt fully cleared");
        assertEq(collector.totalFeesCaptured(), 21 * 1e6, "Total fees captured equals 21 USDC");
        assertEq(collector.buybackBudget(), 10500000, "Buyback budget: $10.50 USDC");
        assertEq(collector.yieldBudget(), 10500000, "Yield budget: $10.50 USDC");
        assertEq(
            collector.buybackBudget() + collector.yieldBudget(),
            collector.totalFeesCaptured(),
            "INV-4 strictly preserved"
        );

        // 3. Repeated repayment when zero debt reverts with NoOutstandingDebt
        vm.prank(borrower);
        vm.expectRevert(NoOutstandingDebt.selector);
        vault.repayFeeDebt(5 * 1e6);
    }

    function test_FeeDebt_RepayFeeDebtFor_ThirdPartyPayer() public {
        _setupOpenHedge();

        MockERC20 usdc = new MockERC20("USD Coin", "USDC", 6);
        MockERC20 aegis = new MockERC20("Aegis", "AEGIS", 18);
        MockAscendHookPool pool = new MockAscendHookPool();
        AegisFeeCollector collector = new AegisFeeCollector(
            address(usdc),
            address(aegis),
            address(pool),
            address(0xDD4),
            owner
        );

        vm.startPrank(owner);
        vault.setFeeCollector(address(collector));
        collector.setAuthorizedVault(address(vault), true);
        vm.stopPrank();

        // Borrower accrues debt
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 42_00000000);
        uint256 exitPrice = 42_00000000;
        bytes memory sigUnwind = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            100 ether,
            exitPrice,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );

        vault.executeUnwindIntent(
            borrower,
            PERP_INDEX,
            exitPrice,
            block.timestamp + 1 hours,
            sigUnwind
        );

        assertEq(vault.getFeeDebt(borrower), 21 * 1e6);

        // Third-party sponsor repays for borrower
        address sponsor = address(0x8888);
        usdc.mint(sponsor, 100 * 1e6);

        vm.startPrank(sponsor);
        usdc.approve(address(collector), 21 * 1e6);

        vm.expectEmit(true, true, false, true);
        emit IAegisVault.FeeDebtRepaid(borrower, sponsor, 21 * 1e6, 0);
        uint256 repaid = vault.repayFeeDebtFor(borrower, 21 * 1e6);
        vm.stopPrank();

        assertEq(repaid, 21 * 1e6);
        assertEq(vault.getFeeDebt(borrower), 0);
        assertEq(usdc.balanceOf(sponsor), 79 * 1e6, "Sponsor funded repayment");
        assertEq(collector.totalFeesCaptured(), 21 * 1e6);
    }

    function test_FeeDebt_RepaymentFailure_DoesNotCorruptDebt() public {
        _setupOpenHedge();

        MockERC20 usdc = new MockERC20("USD Coin", "USDC", 6);
        MockERC20 aegis = new MockERC20("Aegis", "AEGIS", 18);
        MockAscendHookPool pool = new MockAscendHookPool();
        AegisFeeCollector collector = new AegisFeeCollector(
            address(usdc),
            address(aegis),
            address(pool),
            address(0xDD4),
            owner
        );

        vm.startPrank(owner);
        vault.setFeeCollector(address(collector));
        collector.setAuthorizedVault(address(vault), true);
        vm.stopPrank();

        // Accrue debt
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 42_00000000);
        uint256 exitPrice = 42_00000000;
        bytes memory sigUnwind = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            100 ether,
            exitPrice,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );

        vault.executeUnwindIntent(
            borrower,
            PERP_INDEX,
            exitPrice,
            block.timestamp + 1 hours,
            sigUnwind
        );

        assertEq(vault.getFeeDebt(borrower), 21 * 1e6);

        // Repayment attempt fails because borrower has 0 allowance
        vm.prank(borrower);
        vm.expectRevert();
        vault.repayFeeDebt(10 * 1e6);

        // Debt remains untouched and uncorrupted
        assertEq(vault.getFeeDebt(borrower), 21 * 1e6, "Debt must remain unchanged on repayment revert");
        assertEq(collector.totalFeesCaptured(), 0);
    }

    function test_FeeDebt_ZeroAmountRepayment_Reverts() public {
        vm.prank(borrower);
        vm.expectRevert(ZeroRepaymentAmount.selector);
        vault.repayFeeDebt(0);
    }

    function test_FeeDebt_NoOutstandingDebt_Reverts() public {
        assertEq(vault.getFeeDebt(borrower), 0);
        vm.prank(borrower);
        vm.expectRevert(NoOutstandingDebt.selector);
        vault.repayFeeDebt(100 * 1e6);
    }

    function test_FeeDebt_DoesNotBlock_RiskReducingOperations() public {
        _setupOpenHedge();

        MockERC20 usdc = new MockERC20("USD Coin", "USDC", 6);
        MockERC20 aegis = new MockERC20("Aegis", "AEGIS", 18);
        MockAscendHookPool pool = new MockAscendHookPool();
        AegisFeeCollector collector = new AegisFeeCollector(
            address(usdc),
            address(aegis),
            address(pool),
            address(0xDD4),
            owner
        );

        vm.startPrank(owner);
        vault.setFeeCollector(address(collector));
        collector.setAuthorizedVault(address(vault), true);
        vm.stopPrank();

        // Accrue debt via unwind
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 42_00000000);
        uint256 exitPrice = 42_00000000;
        bytes memory sigUnwind = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            100 ether,
            exitPrice,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );

        vault.executeUnwindIntent(
            borrower,
            PERP_INDEX,
            exitPrice,
            block.timestamp + 1 hours,
            sigUnwind
        );

        assertGt(vault.getFeeDebt(borrower), 0, "Borrower has fee debt");

        // 1. manualOverride must NOT be blocked
        vm.prank(borrower);
        vault.manualOverride();
        assertTrue(vault.getProConfig(borrower).manualOverrideActive, "Manual override succeeded despite fee debt");

        // 2. Session key renewal must NOT be blocked
        address newSessionKey = address(0x9999);
        vm.prank(borrower);
        vault.delegateSessionKey(newSessionKey, 7 days);
        assertEq(vault.getPosition(borrower).sessionKey, newSessionKey, "Session key delegated despite fee debt");

        // 3. Session key revocation must NOT be blocked
        vm.prank(borrower);
        vault.revokeSessionKey();
        assertEq(vault.getPosition(borrower).sessionKey, address(0), "Session key revoked despite fee debt");

        // 4. Lowest wick update must NOT be blocked
        vault.updateLowestWick(borrower);
    }

    function test_FeeDebt_RepeatedUnwind_CannotCreateDuplicateDebt() public {
        _setupOpenHedge();

        MockERC20 usdc = new MockERC20("USD Coin", "USDC", 6);
        MockERC20 aegis = new MockERC20("Aegis", "AEGIS", 18);
        MockAscendHookPool pool = new MockAscendHookPool();
        AegisFeeCollector collector = new AegisFeeCollector(
            address(usdc),
            address(aegis),
            address(pool),
            address(0xDD4),
            owner
        );

        vm.startPrank(owner);
        vault.setFeeCollector(address(collector));
        collector.setAuthorizedVault(address(vault), true);
        vm.stopPrank();

        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 42_00000000);
        uint256 exitPrice = 42_00000000;
        bytes memory sigUnwind = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            100 ether,
            exitPrice,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );

        // First unwind succeeds and records debt
        vault.executeUnwindIntent(
            borrower,
            PERP_INDEX,
            exitPrice,
            block.timestamp + 1 hours,
            sigUnwind
        );
        assertEq(vault.getFeeDebt(borrower), 21 * 1e6);

        // Second unwind attempt must immediately revert with InvalidHealthTrigger (hedge is closed)
        vm.expectRevert(InvalidHealthTrigger.selector);
        vault.executeUnwindIntent(
            borrower,
            PERP_INDEX,
            exitPrice,
            block.timestamp + 1 hours,
            sigUnwind
        );

        // Debt remains strictly 21 USDC (no duplicate debt)
        assertEq(vault.getFeeDebt(borrower), 21 * 1e6, "No duplicate debt created");
    }

    // -----------------------------------------------------------------------
    // AEG-06: Session Key & Manual Override enforcement in executeUnwindIntent
    // -----------------------------------------------------------------------

    function test_executeUnwindIntent_reverts_whenManualOverrideActive() public {
        _setupOpenHedge();

        vm.prank(borrower);
        vault.manualOverride();
        assertTrue(vault.getProConfig(borrower).manualOverrideActive);

        uint256 exitPrice = 42_00000000;
        bytes memory sigUnwind = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            100 ether,
            exitPrice,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );

        vm.expectRevert(OverrideActive.selector);
        vault.executeUnwindIntent(
            borrower,
            PERP_INDEX,
            exitPrice,
            block.timestamp + 1 hours,
            sigUnwind
        );
    }

    function test_executeUnwindIntent_reverts_whenSessionKeyExpired() public {
        _setupOpenHedge();

        // Warp time beyond sessionKeyExpiry (which was block.timestamp + 30 days)
        vm.warp(block.timestamp + 31 days);

        uint256 exitPrice = 42_00000000;
        bytes memory sigUnwind = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            100 ether,
            exitPrice,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );

        vm.expectRevert(SessionKeyExpired.selector);
        vault.executeUnwindIntent(
            borrower,
            PERP_INDEX,
            exitPrice,
            block.timestamp + 1 hours,
            sigUnwind
        );
    }

    // -----------------------------------------------------------------------
    // AEG-04: Collateral amount uint96 bounds enforcement in registerPosition
    // -----------------------------------------------------------------------

    function test_registerPosition_reverts_whenAmountExceedsUint96Max() public {
        vm.prank(borrower);
        vm.expectRevert(AmountOverflow.selector);
        vault.registerPosition(
            address(mockCollateral),
            uint256(type(uint96).max) + 1,
            2_000 * 1e6,
            8000
        );
    }

    function test_registerPosition_succeeds_atUint96Max() public {
        vm.prank(borrower);
        vault.registerPosition(
            address(mockCollateral),
            uint256(type(uint96).max),
            2_000 * 1e6,
            8000
        );

        assertEq(
            vault.getPosition(borrower).collateralAmount,
            type(uint96).max,
            "Collateral amount recorded at uint96 max without truncation"
        );
    }

    // -----------------------------------------------------------------------
    // AEG-01: Collateral Decimals Normalization in getVaultHealth
    // -----------------------------------------------------------------------

    function test_getVaultHealth_normalizes_8DecimalCollateral() public {
        MockERC20 wbtc = new MockERC20("Wrapped BTC", "WBTC", 8);
        address user = address(0xB8C);

        // Deposit 1 WBTC (1e8)
        // Debt: 40,000 USDC (40,000 * 1e6)
        // LTV / liquidationThreshold: 8000 (80%)
        vm.prank(user);
        vault.registerPosition(address(wbtc), 1 * 1e8, 40_000 * 1e6, 8000);

        // Mark price: $60,000 (60,000 * 1e8)
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 60_000 * 1e8);

        (uint256 healthFactor,,) = vault.getVaultHealth(user, PERP_INDEX);

        // Normalized collateral: 1e8 * 1e10 = 1e18
        // Numerator: 1e18 * 60,000e8 * 8000 = 4.8e33
        // Denominator: 40,000e6 * 1e20 = 4.0e30
        // Expected health factor: 4.8e33 / 4.0e30 = 12000 (1.20)
        assertEq(healthFactor, 12000, "Health factor should be 1.20 (12000 bps) for 8-decimal WBTC");
    }

    function test_getVaultHealth_normalizes_6DecimalCollateral() public {
        MockERC20 usdt = new MockERC20("Tether USD", "USDT", 6);
        address user = address(0x6DEC);

        // Deposit 50,000 USDT (50,000 * 1e6)
        // Debt: 30,000 USDC (30,000 * 1e6)
        // LTV: 8000 (80%)
        vm.prank(user);
        vault.registerPosition(address(usdt), 50_000 * 1e6, 30_000 * 1e6, 8000);

        // Mark price: $1.00 (1 * 1e8)
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 1 * 1e8);

        (uint256 healthFactor,,) = vault.getVaultHealth(user, PERP_INDEX);

        // Normalized collateral: 50,000e6 * 1e12 = 50,000e18
        // Numerator: 50,000e18 * 1e8 * 8000 = 4e34
        // Denominator: 30,000e6 * 1e20 = 3e30
        // Expected health factor: 4e34 / 3e30 = 13333 (1.3333)
        assertEq(healthFactor, 13333, "Health factor should be 1.3333 (13333 bps) for 6-decimal USDT");
    }

    function test_ExecuteUnwindIntent_CalculatesFeeWithNormalized8DecimalCollateral() public {
        MockFailingFeeCollector mockFee = new MockFailingFeeCollector();
        vm.prank(owner);
        vault.setFeeCollector(address(mockFee));

        MockERC20 wbtc = new MockERC20("Wrapped BTC", "WBTC", 8);
        address user = address(0x8DEC);

        vm.startPrank(user);
        // Deposit 1 WBTC (1e8) with debt $45,000 (45,000 * 1e6), LTV: 80% (8000 bps)
        vault.registerPosition(address(wbtc), 1 * 1e8, 45_000 * 1e6, 8000);
        vault.setProConfig(ProConfig({
            triggerMode: uint8(TriggerMode.HEALTH_FACTOR),
            orderType: uint8(OrderType.POST_ONLY_LIMIT),
            hedgeRatioBps: 10000,
            trailingTakeProfitBps: 200,
            maxSlippageBps: 50,
            sessionKeyExpiry: 0,
            manualOverrideActive: false,
            priceTrigger: 0,
            healthFactorTrigger: 11000
        }));
        vault.delegateSessionKey(sessionKeyAddress, 7 days);
        vm.stopPrank();

        // 1. Mark price drops to $50,000 (breaches trigger: H = (1e18 * 50,000e8 * 8000) / (45,000e6 * 1e20) = 4.0e33 / 4.5e30 = 8888 bps < 11000 bps)
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 50_000 * 1e8);

        // Execute hedge intent
        bytes memory sigHedge = _signHedge(
            sessionKeyPrivateKey,
            user,
            PERP_INDEX,
            -1 ether,
            50_000 * 1e8,
            vault.vaultNonces(user),
            block.timestamp + 1 hours
        );
        vault.executeHedgeIntent(
            user,
            PERP_INDEX,
            -1 ether,
            50_000 * 1e8,
            block.timestamp + 1 hours,
            sigHedge
        );
        assertTrue(vault.getActiveHedge(user).isOpen);

        // 2. Rebound price to $60,000 (trailing target was 50,000 * 1.02 = $51,000)
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 60_000 * 1e8);

        bytes memory sigUnwind = _signHedge(
            sessionKeyPrivateKey,
            user,
            PERP_INDEX,
            1 ether,
            60_000 * 1e8,
            vault.vaultNonces(user),
            block.timestamp + 1 hours
        );

        // Execute unwind
        vault.executeUnwindIntent(
            user,
            PERP_INDEX,
            60_000 * 1e8,
            block.timestamp + 1 hours,
            sigUnwind
        );

        assertFalse(vault.getActiveHedge(user).isOpen);

        // Fee calculation verification:
        // normCollateral = 1e8 * 1e10 = 1e18
        // valuationPrice = 60,000 * 1e8
        // colValUsdc = (1e18 * 60,000e8) / 1e20 = 60,000 * 1e6 ($60,000 USDC)
        // savedPenalty = (60,000e6 * 500) / 10000 = 3,000 * 1e6 ($3,000 USDC)
        // protocolFee = (3,000e6 * 1000) / 10000 = 300 * 1e6 ($300 USDC)
        // Since user has not approved USDC, fee collection fails and feeDebts is accrued:
        assertEq(
            vault.feeDebts(user),
            300 * 1e6,
            "Fee debt should be exactly $300 USDC (300e6) for normalized 8-decimal WBTC collateral"
        );
    }

    // ==========================================
    // TASK 4: HARDENED ON-CHAIN INVARIANTS & REVIEWS
    // ==========================================

    function test_RevertIf_HedgeDirectionIsPositive() public {
        vm.startPrank(borrower);
        vault.registerPosition(address(mockCollateral), 100 ether, 3_000 * 1e6, 8000);
        vault.setProConfig(ProConfig({
            triggerMode: uint8(TriggerMode.HEALTH_FACTOR),
            orderType: uint8(OrderType.POST_ONLY_LIMIT),
            hedgeRatioBps: 10000,
            trailingTakeProfitBps: 200,
            maxSlippageBps: 50,
            sessionKeyExpiry: 0,
            manualOverrideActive: false,
            priceTrigger: 0,
            healthFactorTrigger: 11000
        }));
        vault.delegateSessionKey(sessionKeyAddress, 7 days);
        vm.stopPrank();

        int256 positiveSize = 100 ether; // Attempt to open LONG instead of SHORT
        uint256 limitPrice = 39_80000000;
        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = vault.vaultNonces(borrower);

        bytes memory signature = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            positiveSize,
            limitPrice,
            nonce,
            deadline
        );

        vm.expectRevert(InvalidHedgeDirection.selector);
        vault.executeHedgeIntent(
            borrower,
            PERP_INDEX,
            positiveSize,
            limitPrice,
            deadline,
            signature
        );
    }

    function test_RevertIf_HedgeLimitPriceViolatesSlippage() public {
        vm.startPrank(borrower);
        vault.registerPosition(address(mockCollateral), 100 ether, 3_000 * 1e6, 8000);
        vault.setProConfig(ProConfig({
            triggerMode: uint8(TriggerMode.HEALTH_FACTOR),
            orderType: uint8(OrderType.POST_ONLY_LIMIT),
            hedgeRatioBps: 10000,
            trailingTakeProfitBps: 200,
            maxSlippageBps: 50, // 0.5% max slippage (min price $39.80 for $40 mark)
            sessionKeyExpiry: 0,
            manualOverrideActive: false,
            priceTrigger: 0,
            healthFactorTrigger: 11000
        }));
        vault.delegateSessionKey(sessionKeyAddress, 7 days);
        vm.stopPrank();

        int256 hedgeSize = -100 ether;
        uint256 badLimitPrice = 39_00000000; // $39.00 = 2.5% slippage -> exceeds 50 bps
        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = vault.vaultNonces(borrower);

        bytes memory signature = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            hedgeSize,
            badLimitPrice,
            nonce,
            deadline
        );

        vm.expectRevert(SlippageExceeded.selector);
        vault.executeHedgeIntent(
            borrower,
            PERP_INDEX,
            hedgeSize,
            badLimitPrice,
            deadline,
            signature
        );
    }

    function test_RevertIf_HedgeSizeExceedsHedgeRatio() public {
        vm.startPrank(borrower);
        vault.registerPosition(address(mockCollateral), 100 ether, 3_000 * 1e6, 8000);
        vault.setProConfig(ProConfig({
            triggerMode: uint8(TriggerMode.HEALTH_FACTOR),
            orderType: uint8(OrderType.POST_ONLY_LIMIT),
            hedgeRatioBps: 5000, // 50% hedge ratio -> max allowed ~52.5 ether
            trailingTakeProfitBps: 200,
            maxSlippageBps: 50,
            sessionKeyExpiry: 0,
            manualOverrideActive: false,
            priceTrigger: 0,
            healthFactorTrigger: 11000
        }));
        vault.delegateSessionKey(sessionKeyAddress, 7 days);
        vm.stopPrank();

        int256 oversizedHedge = -100 ether; // 100 ether exceeds 50% hedge ratio
        uint256 limitPrice = 39_80000000;
        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = vault.vaultNonces(borrower);

        bytes memory signature = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            oversizedHedge,
            limitPrice,
            nonce,
            deadline
        );

        vm.expectRevert(HedgeSizeExceeded.selector);
        vault.executeHedgeIntent(
            borrower,
            PERP_INDEX,
            oversizedHedge,
            limitPrice,
            deadline,
            signature
        );
    }

    function test_Owner_ManualUnwind_SucceedsAfterOverride() public {
        // Setup position and open hedge
        vm.startPrank(borrower);
        vault.registerPosition(address(mockCollateral), 100 ether, 3_000 * 1e6, 8000);
        vault.setProConfig(ProConfig({
            triggerMode: uint8(TriggerMode.HEALTH_FACTOR),
            orderType: uint8(OrderType.POST_ONLY_LIMIT),
            hedgeRatioBps: 10000,
            trailingTakeProfitBps: 200,
            maxSlippageBps: 50,
            sessionKeyExpiry: 0,
            manualOverrideActive: false,
            priceTrigger: 0,
            healthFactorTrigger: 11000
        }));
        vault.delegateSessionKey(sessionKeyAddress, 7 days);
        vm.stopPrank();

        bytes memory sigHedge = _signHedge(
            sessionKeyPrivateKey,
            borrower,
            PERP_INDEX,
            -100 ether,
            39_80000000,
            0,
            block.timestamp + 1 hours
        );
        vault.executeHedgeIntent(borrower, PERP_INDEX, -100 ether, 39_80000000, block.timestamp + 1 hours, sigHedge);
        assertTrue(vault.getActiveHedge(borrower).isOpen);

        // Owner triggers manual override (INV-3) - session key revoked, keeper blocked
        vm.prank(borrower);
        vault.manualOverride();
        assertTrue(vault.getProConfig(borrower).manualOverrideActive);
        assertEq(vault.getPosition(borrower).sessionKey, address(0));

        // Rebound mark price to $42.00
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 42_00000000);

        // Non-owner trying to manualUnwind reverts
        vm.prank(address(0xCC3));
        vm.expectRevert(NoActiveHedge.selector);
        vault.manualUnwind(PERP_INDEX, 42_00000000);

        // Owner directly calls manualUnwind - succeeds without session key!
        vm.prank(borrower);
        vault.manualUnwind(PERP_INDEX, 42_00000000);

        assertFalse(vault.getActiveHedge(borrower).isOpen, "Hedge must be closed");
    }

    function test_RevertIf_RegisterPosition_ZeroAmountOrDebt() public {
        vm.startPrank(borrower);
        vm.expectRevert(InvalidAmount.selector);
        vault.registerPosition(address(mockCollateral), 0, 3_000 * 1e6, 8000);

        vm.expectRevert(InvalidAmount.selector);
        vault.registerPosition(address(mockCollateral), 100 ether, 0, 8000);
        vm.stopPrank();
    }
}


