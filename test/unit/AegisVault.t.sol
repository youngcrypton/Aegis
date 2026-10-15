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
    IntentExpired
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
        uint256 limitPrice = 39_00000000;
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
            39_00000000,
            0,
            block.timestamp + 1 hours
        );

        vm.expectRevert(InvalidHealthTrigger.selector);
        vault.executeHedgeIntent(
            borrower,
            PERP_INDEX,
            -10 ether,
            39_00000000,
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
            39_00000000,
            0,
            block.timestamp + 1 hours
        );

        vault.executeHedgeIntent(
            borrower,
            PERP_INDEX,
            -100 ether,
            39_00000000,
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
            39_00000000,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );

        vault.executeHedgeIntent(
            borrower,
            PERP_INDEX,
            firstHedgeSize,
            39_00000000,
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
            39_00000000,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );
        vault.executeHedgeIntent(
            borrower,
            PERP_INDEX,
            -50 ether,
            39_00000000,
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
            39_00000000,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );
        vault.executeHedgeIntent(
            borrower,
            PERP_INDEX,
            -50 ether,
            39_00000000,
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
            39_00000000,
            0,
            block.timestamp + 1 hours
        );
        vault.executeHedgeIntent(borrower, PERP_INDEX, -100 ether, 39_00000000, block.timestamp + 1 hours, sigHedge);

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
            39_00000000,
            0,
            block.timestamp + 1 hours
        );
        vault.executeHedgeIntent(borrower, PERP_INDEX, -100 ether, 39_00000000, block.timestamp + 1 hours, sigHedge);

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
            39_00000000,
            0,
            block.timestamp + 1 hours
        );
        vault.executeHedgeIntent(borrower, PERP_INDEX, -100 ether, 39_00000000, block.timestamp + 1 hours, sigHedge);

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
            39_00000000,
            0,
            block.timestamp + 1 hours
        );
        vault.executeHedgeIntent(borrower, PERP_INDEX, -100 ether, 39_00000000, block.timestamp + 1 hours, sigHedge);

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
            39_00000000,
            0,
            block.timestamp + 1 hours
        );
        vault.executeHedgeIntent(borrower, PERP_INDEX, -100 ether, 39_00000000, block.timestamp + 1 hours, sigHedge);

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
            39_00000000,
            vault.vaultNonces(borrower),
            block.timestamp + 1 hours
        );
        vault.executeHedgeIntent(borrower, PERP_INDEX, -100 ether, 39_00000000, block.timestamp + 1 hours, sigHedge);
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
}
