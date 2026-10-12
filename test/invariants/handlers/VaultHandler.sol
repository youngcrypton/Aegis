// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {AegisVault} from "../../../contracts/AegisVault.sol";
import {AegisSentinelRegistry} from "../../../contracts/AegisSentinelRegistry.sol";
import {AegisFeeCollector} from "../../../contracts/AegisFeeCollector.sol";
import {
    TriggerMode,
    OrderType,
    ProConfig,
    VaultPosition
} from "../../../contracts/AegisTypes.sol";
import {MockERC20} from "../../mocks/MockERC20.sol";
import {MockHyperCoreWriter} from "../../mocks/MockHyperCoreWriter.sol";
import {MockHyperCorePrecompile} from "../../mocks/MockHyperCorePrecompile.sol";
import {MockAscendHookPool} from "../../mocks/MockAscendHookPool.sol";

// Test harness extending AegisVault to configure mock writer
contract InvariantVaultHarness is AegisVault {
    constructor(address initialOwner, address _writer) AegisVault(initialOwner) {
        _setHyperCoreWriter(_writer);
    }
}

/**
 * @title VaultHandler
 * @notice Stateful invariant test handler exposing randomized bounded actions across AEGIS contracts.
 */
contract VaultHandler is Test {
    InvariantVaultHarness public vault;
    AegisSentinelRegistry public registry;
    AegisFeeCollector public feeCollector;

    MockERC20 public aegisToken;
    MockERC20 public usdcToken;
    MockERC20 public collateralToken;
    MockHyperCoreWriter public mockWriter;
    MockAscendHookPool public mockPool;

    address public owner = address(0xAA1);
    address public borrower = address(0xBB2);
    address public sentinel = address(0xCC3);
    address public victim = address(0xDD4);
    address public stakers = address(0xEE5);

    uint256 public sessionKeyPrivateKey = 0x5E5510;
    address public sessionKeyAddress;

    address public constant PRECOMPILE_0x0801 = address(0x0801);
    uint32 public constant PERP_INDEX = 0;

    // Ghost variables for invariant checking
    uint256 public ghost_noncesObserved;
    uint256 public ghost_maxSlashBpsObserved;
    bool public ghost_overrideEverCalled;
    uint256 public ghost_totalFeesProcessed;

    constructor() {
        sessionKeyAddress = vm.addr(sessionKeyPrivateKey);

        aegisToken = new MockERC20("Aegis", "AEGIS", 18);
        usdcToken = new MockERC20("USD Coin", "USDC", 6);
        collateralToken = new MockERC20("Collateral", "COL", 18);

        mockWriter = new MockHyperCoreWriter();
        mockPool = new MockAscendHookPool();
        MockHyperCorePrecompile mockPrecompile = new MockHyperCorePrecompile();

        vm.etch(PRECOMPILE_0x0801, address(mockPrecompile).code);
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 40_00000000);

        vault = new InvariantVaultHarness(owner, address(mockWriter));
        registry = new AegisSentinelRegistry(address(aegisToken), owner);
        feeCollector = new AegisFeeCollector(
            address(usdcToken),
            address(aegisToken),
            address(mockPool),
            stakers,
            owner
        );

        // Authorizations
        vm.startPrank(owner);
        vault.setFeeCollector(address(feeCollector));
        registry.setAuthorizedSlasher(address(this), true);
        feeCollector.setAuthorizedVault(address(vault), true);
        feeCollector.setAuthorizedVault(address(this), true);
        vm.stopPrank();

        // Liquidity & Approvals
        aegisToken.mint(address(mockPool), 10_000_000 ether);
        aegisToken.mint(sentinel, 1_000_000 ether);
        usdcToken.mint(borrower, 10_000_000 * 1e6);

        vm.prank(sentinel);
        aegisToken.approve(address(registry), type(uint256).max);

        vm.prank(borrower);
        usdcToken.approve(address(feeCollector), type(uint256).max);

        // Initial setup for borrower
        vm.startPrank(borrower);
        vault.registerPosition(address(collateralToken), 100 ether, 2_000 * 1e6, 8000);
        vault.setProConfig(ProConfig({
            triggerMode: uint8(TriggerMode.HEALTH_FACTOR),
            orderType: uint8(OrderType.POST_ONLY_LIMIT),
            hedgeRatioBps: 5000,
            trailingTakeProfitBps: 150,
            maxSlippageBps: 50,
            sessionKeyExpiry: 0,
            manualOverrideActive: false,
            priceTrigger: 0,
            healthFactorTrigger: 11000
        }));
        vault.delegateSessionKey(sessionKeyAddress, 30 days);
        vm.stopPrank();

        // Initial sentinel stake
        vm.prank(sentinel);
        registry.bondStake(25_000 ether);
    }

    function action_registerPosition(uint256 amount, uint256 debtUsdc, uint16 ltvBps) external {
        amount = bound(amount, 1 ether, 1000 ether);
        debtUsdc = bound(debtUsdc, 100 * 1e6, 50_000 * 1e6);
        ltvBps = uint16(bound(ltvBps, 5000, 9500));

        vm.prank(borrower);
        vault.registerPosition(address(collateralToken), amount, debtUsdc, ltvBps);
    }

    function action_setProConfig(
        uint16 hedgeRatioBps,
        uint16 trailingTakeProfitBps,
        uint16 maxSlippageBps,
        uint256 healthFactorTrigger
    ) external {
        hedgeRatioBps = uint16(bound(hedgeRatioBps, 1000, 10000));
        trailingTakeProfitBps = uint16(bound(trailingTakeProfitBps, 50, 500));
        maxSlippageBps = uint16(bound(maxSlippageBps, 10, 100));
        healthFactorTrigger = bound(healthFactorTrigger, 10200, 13000);

        ProConfig memory cfg = ProConfig({
            triggerMode: uint8(TriggerMode.HEALTH_FACTOR),
            orderType: uint8(OrderType.POST_ONLY_LIMIT),
            hedgeRatioBps: hedgeRatioBps,
            trailingTakeProfitBps: trailingTakeProfitBps,
            maxSlippageBps: maxSlippageBps,
            sessionKeyExpiry: 0,
            manualOverrideActive: false,
            priceTrigger: 0,
            healthFactorTrigger: healthFactorTrigger
        });

        vm.prank(borrower);
        vault.setProConfig(cfg);
    }

    function action_manualOverride() external {
        vm.prank(borrower);
        vault.manualOverride();
        ghost_overrideEverCalled = true;
    }

    function action_slashSentinel(uint256 slashBps) external {
        // Bound to valid range to see valid state changes
        slashBps = bound(slashBps, 1, 1000);
        if (slashBps > ghost_maxSlashBpsObserved) {
            ghost_maxSlashBpsObserved = slashBps;
        }

        if (registry.isSentinelActive(sentinel)) {
            registry.slashSentinel(sentinel, victim, slashBps, "Fuzz SLA breach");
        }
    }

    function action_processFee(uint256 savedPenalty) external {
        savedPenalty = bound(savedPenalty, 10 * 1e6, 100_000 * 1e6);
        usdcToken.mint(borrower, savedPenalty);

        feeCollector.processAvertedFee(borrower, savedPenalty);
        ghost_totalFeesProcessed += (savedPenalty * 1000) / 10000;
    }

    function action_executeBuybackAndBurn() external {
        if (feeCollector.buybackBudget() > 0) {
            feeCollector.executeBuybackAndBurn();
        }
    }

    function action_distributeYield() external {
        if (feeCollector.yieldBudget() > 0) {
            feeCollector.distributeYield();
        }
    }

    function action_dispatchHedgeIntent() external {
        if (vault.getProConfig(borrower).manualOverrideActive) return;

        // Simulate crash
        MockHyperCorePrecompile(PRECOMPILE_0x0801).setMockPrice(PERP_INDEX, 25_00000000);

        (, bool isTriggered, uint256 markPrice) = vault.getVaultHealth(borrower, PERP_INDEX);
        if (!isTriggered) return;

        uint256 nonce = vault.vaultNonces(borrower);
        bytes32 digest = vault.hashHedgeIntent(
            borrower,
            PERP_INDEX,
            -50 ether,
            markPrice,
            nonce,
            block.timestamp + 1 hours
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(sessionKeyPrivateKey, digest);
        bytes memory sig = abi.encodePacked(r, s, v);

        try vault.executeHedgeIntent(
            borrower,
            PERP_INDEX,
            -50 ether,
            markPrice,
            block.timestamp + 1 hours,
            sig
        ) {
            ghost_noncesObserved++;
        } catch {}
    }
}
