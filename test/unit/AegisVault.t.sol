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
    ZeroAddress
} from "../../contracts/AegisTypes.sol";
import {MockHyperCorePrecompile} from "../mocks/MockHyperCorePrecompile.sol";
import {MockHyperCoreWriter} from "../mocks/MockHyperCoreWriter.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

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

        // Now unwind hedge at exitPrice = $42.00
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
}
