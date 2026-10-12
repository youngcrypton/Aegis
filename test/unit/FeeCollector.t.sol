// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {AegisFeeCollector} from "../../contracts/AegisFeeCollector.sol";
import {IAegisFeeCollector} from "../../contracts/interfaces/IAegisFeeCollector.sol";
import {ZeroAddress, UnauthorizedCaller} from "../../contracts/AegisTypes.sol";
import {MockERC20} from "../mocks/MockERC20.sol";
import {MockAscendHookPool} from "../mocks/MockAscendHookPool.sol";

contract FeeCollectorTest is Test {
    AegisFeeCollector internal feeCollector;
    MockERC20 internal usdc;
    MockERC20 internal aegis;
    MockAscendHookPool internal hookPool;

    address internal owner = address(0xAA1);
    address internal vault = address(0xBB2);
    address internal vaultOwner = address(0xCC3);
    address internal stakersTarget = address(0xDD4);
    address internal unauthorized = address(0xEE5);
    address internal constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC", 6);
        aegis = new MockERC20("Aegis Protocol", "AEGIS", 18);
        hookPool = new MockAscendHookPool();

        feeCollector = new AegisFeeCollector(
            address(usdc),
            address(aegis),
            address(hookPool),
            stakersTarget,
            owner
        );

        // Authorize vault
        vm.prank(owner);
        feeCollector.setAuthorizedVault(vault, true);

        // Mint liquidity for pool
        aegis.mint(address(hookPool), 10_000_000 ether);

        // Mint USDC to vaultOwner and approve feeCollector
        usdc.mint(vaultOwner, 1_000_000 * 1e6);
        vm.prank(vaultOwner);
        usdc.approve(address(feeCollector), type(uint256).max);
    }

    function test_ProcessAvertedFee_ExactFiftyFiftySplit() public {
        uint256 savedPenalty = 1_000 * 1e6; // $1,000 USDC penalty saved
        uint256 expectedFee = 100 * 1e6;   // 10% = $100 USDC
        uint256 expectedBuyback = 50 * 1e6; // 50% = $50 USDC
        uint256 expectedYield = 50 * 1e6;   // 50% = $50 USDC

        vm.prank(vault);
        feeCollector.processAvertedFee(vaultOwner, savedPenalty);

        assertEq(feeCollector.totalFeesCaptured(), expectedFee, "Total captured should be 10% fee");
        assertEq(feeCollector.buybackBudget(), expectedBuyback, "Buyback budget must be exactly 50%");
        assertEq(feeCollector.yieldBudget(), expectedYield, "Yield budget must be exactly 50%");
        assertEq(usdc.balanceOf(address(feeCollector)), expectedFee, "Collector balance should match captured fee");
    }

    function testFuzz_InvariantINV4_OddNumberZeroLeakage(uint256 savedPenalty) public {
        // Bound between 10 USDC and 100,000,000 USDC
        vm.assume(savedPenalty >= 10 * 1e6 && savedPenalty <= 100_000_000 * 1e6);

        usdc.mint(vaultOwner, savedPenalty);

        vm.prank(vault);
        feeCollector.processAvertedFee(vaultOwner, savedPenalty);

        uint256 fee = (savedPenalty * 1000) / 10000;
        uint256 bBudget = feeCollector.buybackBudget();
        uint256 yBudget = feeCollector.yieldBudget();

        // Strict Invariant INV-4: Zero unallocated fee leakage
        assertEq(bBudget + yBudget, fee, "INV-4: buyback + yield must strictly equal total fee");
    }

    function test_ExecuteBuybackAndBurn_TransfersToDeadAddress() public {
        uint256 savedPenalty = 2_000 * 1e6; // $2,000 USDC saved -> $200 fee -> $100 buyback budget
        vm.prank(vault);
        feeCollector.processAvertedFee(vaultOwner, savedPenalty);

        uint256 buybackBudget = feeCollector.buybackBudget();
        assertEq(buybackBudget, 100 * 1e6);

        uint256 deadBalanceBefore = aegis.balanceOf(DEAD_ADDRESS);

        feeCollector.executeBuybackAndBurn();

        // Rate in mock pool: 1 USDC = 10 AEGIS
        // For $100 USDC (100 * 1e6) -> 1,000 AEGIS (1000 * 1e18)
        uint256 expectedAegisBurned = 100 * 1e6 * (10 * 1e12);

        assertEq(aegis.balanceOf(DEAD_ADDRESS) - deadBalanceBefore, expectedAegisBurned, "Dead address must receive burned AEGIS");
        assertEq(feeCollector.buybackBudget(), 0, "Buyback budget must reset to 0");
        assertEq(feeCollector.totalBurnedFees(), buybackBudget, "Total burned fees must equal budget");
        assertEq(feeCollector.totalAegisBurned(), expectedAegisBurned, "Total AEGIS burned must update");
    }

    function test_DistributeYield_TransfersToStakersTarget() public {
        uint256 savedPenalty = 2_000 * 1e6; // $2,000 USDC saved -> $200 fee -> $100 yield budget
        vm.prank(vault);
        feeCollector.processAvertedFee(vaultOwner, savedPenalty);

        uint256 yieldBudget = feeCollector.yieldBudget();
        assertEq(yieldBudget, 100 * 1e6);

        uint256 stakersBefore = usdc.balanceOf(stakersTarget);

        feeCollector.distributeYield();

        assertEq(usdc.balanceOf(stakersTarget) - stakersBefore, yieldBudget, "Stakers target must receive yield USDC");
        assertEq(feeCollector.yieldBudget(), 0, "Yield budget must reset to 0");
        assertEq(feeCollector.totalDistributedYield(), yieldBudget, "Total distributed yield must update");
    }

    function test_ProcessAvertedFee_ZeroAmountReverts() public {
        vm.prank(vault);
        vm.expectRevert(AegisFeeCollector.ZeroAmount.selector);
        feeCollector.processAvertedFee(vaultOwner, 0);
    }

    function test_ProcessAvertedFee_UnauthorizedCallerReverts() public {
        vm.prank(unauthorized);
        vm.expectRevert(UnauthorizedCaller.selector);
        feeCollector.processAvertedFee(vaultOwner, 1_000 * 1e6);
    }

    function test_ExecuteBuybackAndBurn_ZeroBudgetReverts() public {
        vm.expectRevert(AegisFeeCollector.InsufficientBudget.selector);
        feeCollector.executeBuybackAndBurn();
    }

    function test_DistributeYield_ZeroBudgetReverts() public {
        vm.expectRevert(AegisFeeCollector.InsufficientBudget.selector);
        feeCollector.distributeYield();
    }

    function test_ExecuteBuybackAndBurn_SlippageExceeded() public {
        vm.prank(vault);
        feeCollector.processAvertedFee(vaultOwner, 1_000 * 1e6);

        // Required output exceeds pool rate -> must revert
        vm.expectRevert("MockAscendHookPool: slippage exceeded");
        feeCollector.executeBuybackAndBurn(type(uint256).max);
    }

    function test_InvariantINV4_LifecycleAccountingConservation() public {
        // Multi-stage fee generation and spending lifecycle
        vm.startPrank(vault);
        feeCollector.processAvertedFee(vaultOwner, 1_000 * 1e6);
        feeCollector.processAvertedFee(vaultOwner, 3_000 * 1e6);
        vm.stopPrank();

        feeCollector.executeBuybackAndBurn();

        vm.prank(vault);
        feeCollector.processAvertedFee(vaultOwner, 5_000 * 1e6);

        feeCollector.distributeYield();

        // Full Invariant INV-4 conservation check:
        // totalFeesCaptured == totalBurnedFees + buybackBudget + totalDistributedYield + yieldBudget
        uint256 totalCaptured = feeCollector.totalFeesCaptured();
        uint256 sumOfParts = feeCollector.totalBurnedFees() +
            feeCollector.buybackBudget() +
            feeCollector.totalDistributedYield() +
            feeCollector.yieldBudget();

        assertEq(totalCaptured, sumOfParts, "INV-4: Total captured must equal sum of all allocated and distributed parts");
    }
}
