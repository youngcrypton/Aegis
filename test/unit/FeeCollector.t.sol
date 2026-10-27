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

    // =========================================================================
    // PHASE 1C: FEE COLLECTION FAILURE MODES & ACCOUNTING EDGE CASES
    // =========================================================================

    function test_ProcessAvertedFee_MissingUsdcApprovalReverts() public {
        address unapprovedUser = address(0x9991);
        usdc.mint(unapprovedUser, 1_000_000 * 1e6);
        // Zero allowance approved

        vm.prank(vault);
        vm.expectRevert(); // ERC20InsufficientAllowance
        feeCollector.processAvertedFee(unapprovedUser, 1_000 * 1e6);

        assertEq(feeCollector.totalFeesCaptured(), 0);
        assertEq(feeCollector.buybackBudget(), 0);
        assertEq(feeCollector.yieldBudget(), 0);
    }

    function test_ProcessAvertedFee_InsufficientAllowanceReverts() public {
        address partialUser = address(0x9992);
        usdc.mint(partialUser, 1_000_000 * 1e6);
        // Fee will be 100 USDC; approve only 50 USDC
        vm.prank(partialUser);
        usdc.approve(address(feeCollector), 50 * 1e6);

        vm.prank(vault);
        vm.expectRevert(); // ERC20InsufficientAllowance
        feeCollector.processAvertedFee(partialUser, 1_000 * 1e6);

        assertEq(feeCollector.totalFeesCaptured(), 0);
    }

    function test_ProcessAvertedFee_InsufficientBorrowerBalanceReverts() public {
        address brokeUser = address(0x9993);
        // Approve max, but hold 0 USDC balance
        vm.prank(brokeUser);
        usdc.approve(address(feeCollector), type(uint256).max);

        vm.prank(vault);
        vm.expectRevert(); // ERC20InsufficientBalance
        feeCollector.processAvertedFee(brokeUser, 1_000 * 1e6);

        assertEq(feeCollector.totalFeesCaptured(), 0);
    }

    function test_ProcessAvertedFee_ZeroFeeDueToSmallPenaltyReverts() public {
        // Saved penalty < 10 wei -> (9 * 1000) / 10000 = 0
        vm.prank(vault);
        vm.expectRevert(AegisFeeCollector.ZeroAmount.selector);
        feeCollector.processAvertedFee(vaultOwner, 9);
    }

    function test_ProcessAvertedFee_ZeroAddressVaultOwnerReverts() public {
        vm.prank(vault);
        vm.expectRevert(ZeroAddress.selector);
        feeCollector.processAvertedFee(address(0), 1_000 * 1e6);
    }

    function test_ProcessAvertedFee_PreFundedCollectorDoesNotBypassAllowance_Reverts() public {
        address zeroAllowanceUser = address(0x9994);
        usdc.mint(zeroAllowanceUser, 1_000 * 1e6);
        // User has 0 allowance

        // Directly seed collector with 100 USDC surplus
        usdc.mint(address(feeCollector), 100 * 1e6);

        vm.prank(vault);
        // Saved penalty 1,000 USDC -> 100 USDC fee
        // Must revert with ERC20InsufficientAllowance: surplus cannot bypass safeTransferFrom
        vm.expectRevert();
        feeCollector.processAvertedFee(zeroAllowanceUser, 1_000 * 1e6);

        // State remains completely uncorrupted
        assertEq(feeCollector.totalFeesCaptured(), 0, "No fees captured on failed pull");
        assertEq(feeCollector.buybackBudget(), 0, "Buyback budget remains 0");
        assertEq(feeCollector.yieldBudget(), 0, "Yield budget remains 0");
        assertEq(usdc.balanceOf(zeroAllowanceUser), 1_000 * 1e6, "User tokens untouched");
    }

    function test_ProcessFeeDebtPayment_ExactAllocationAndConservation() public {
        address payer = address(0x7771);
        address borrower = address(0x7772);
        uint256 debtAmount = 250 * 1e6; // $250 USDC

        usdc.mint(payer, 1_000 * 1e6);
        vm.prank(payer);
        usdc.approve(address(feeCollector), debtAmount);

        vm.prank(vault);
        vm.expectEmit(true, true, false, true, address(feeCollector));
        emit IAegisFeeCollector.FeeDebtPaymentProcessed(
            payer,
            borrower,
            debtAmount,
            125 * 1e6,
            125 * 1e6
        );
        feeCollector.processFeeDebtPayment(payer, borrower, debtAmount);

        assertEq(feeCollector.totalFeesCaptured(), debtAmount);
        assertEq(feeCollector.buybackBudget(), 125 * 1e6);
        assertEq(feeCollector.yieldBudget(), 125 * 1e6);
        assertEq(usdc.balanceOf(address(feeCollector)), debtAmount);
        assertEq(usdc.balanceOf(payer), 750 * 1e6);
    }

    function test_ProcessFeeDebtPayment_ZeroAmountReverts() public {
        vm.prank(vault);
        vm.expectRevert(AegisFeeCollector.ZeroAmount.selector);
        feeCollector.processFeeDebtPayment(vaultOwner, vaultOwner, 0);
    }

    function test_ProcessFeeDebtPayment_ZeroAddressReverts() public {
        vm.prank(vault);
        vm.expectRevert(ZeroAddress.selector);
        feeCollector.processFeeDebtPayment(address(0), vaultOwner, 100 * 1e6);

        vm.prank(vault);
        vm.expectRevert(ZeroAddress.selector);
        feeCollector.processFeeDebtPayment(vaultOwner, address(0), 100 * 1e6);
    }

    function test_ProcessFeeDebtPayment_UnauthorizedCallerReverts() public {
        vm.prank(unauthorized);
        vm.expectRevert(UnauthorizedCaller.selector);
        feeCollector.processFeeDebtPayment(vaultOwner, vaultOwner, 100 * 1e6);
    }

    function test_ProcessFeeDebtPayment_InsufficientAllowanceReverts() public {
        address brokePayer = address(0x7773);
        usdc.mint(brokePayer, 1_000 * 1e6);
        // Only approve 50 USDC for a 100 USDC debt payment
        vm.prank(brokePayer);
        usdc.approve(address(feeCollector), 50 * 1e6);

        vm.prank(vault);
        vm.expectRevert(); // ERC20InsufficientAllowance
        feeCollector.processFeeDebtPayment(brokePayer, vaultOwner, 100 * 1e6);

        assertEq(feeCollector.totalFeesCaptured(), 0);
    }

    function test_ProcessAvertedFee_ExactOddPennySplit() public {
        // savedPenaltyAmount = 10 wei -> fee = 1 wei
        vm.prank(vault);
        feeCollector.processAvertedFee(vaultOwner, 10);

        uint256 buyback = feeCollector.buybackBudget(); // 1 / 2 = 0
        uint256 yieldShare = feeCollector.yieldBudget(); // 1 - 0 = 1

        assertEq(buyback, 0);
        assertEq(yieldShare, 1);
        assertEq(buyback + yieldShare, 1, "INV-4: Exact conservation on odd 1-wei fee");
    }

    function test_ExecuteBuybackAndBurn_EnforcesMinBuybackRateSlippage() public {
        uint256 savedPenalty = 2_000 * 1e6; // $2,000 saved -> $200 fee -> $100 buyback budget
        vm.prank(vault);
        feeCollector.processAvertedFee(vaultOwner, savedPenalty);

        // Pool rate is 1 USDC = 10 AEGIS (10 ether per 1 USDC).
        // Set minBuybackRate to 12 ether (requires at least 12 AEGIS per 1 USDC).
        // Since pool only gives 10 AEGIS per 1 USDC, slippage should revert!
        vm.prank(owner);
        feeCollector.setMinBuybackRate(12 ether);

        vm.expectRevert("MockAscendHookPool: slippage exceeded");
        feeCollector.executeBuybackAndBurn();

        // Now set minBuybackRate to 9 ether (requires at least 9 AEGIS per 1 USDC).
        // Since pool gives 10 AEGIS per 1 USDC, this must succeed!
        vm.prank(owner);
        feeCollector.setMinBuybackRate(9 ether);

        feeCollector.executeBuybackAndBurn();
        assertEq(feeCollector.buybackBudget(), 0);
    }
}

