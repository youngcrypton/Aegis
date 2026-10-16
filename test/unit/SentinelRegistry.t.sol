// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {AegisSentinelRegistry} from "../../contracts/AegisSentinelRegistry.sol";
import {IAegisSentinelRegistry} from "../../contracts/interfaces/IAegisSentinelRegistry.sol";
import {
    SentinelNode,
    InsufficientBondAmount,
    UnauthorizedCaller,
    SlashExceedsMaxBound,
    ZeroAddress,
    CooldownActive,
    NoUnbondRequest
} from "../../contracts/AegisTypes.sol";
import {MockERC20} from "../mocks/MockERC20.sol";

contract SentinelRegistryTest is Test {
    AegisSentinelRegistry internal registry;
    MockERC20 internal aegisToken;

    address internal owner = address(0xAA1);
    address internal operator = address(0xBB2);
    address internal victim = address(0xCC3);
    address internal unauthorized = address(0xDD4);
    address internal slasher = address(0xEE5);

    uint256 internal constant MIN_BOND = 25_000 * 1e18;

    function setUp() public {
        aegisToken = new MockERC20("Aegis Protocol", "AEGIS", 18);
        registry = new AegisSentinelRegistry(address(aegisToken), owner);

        // Mint tokens to operator
        aegisToken.mint(operator, 100_000 * 1e18);

        // Operator approves registry
        vm.prank(operator);
        aegisToken.approve(address(registry), type(uint256).max);

        // Owner authorizes slasher
        vm.prank(owner);
        registry.setAuthorizedSlasher(slasher, true);
    }

    function test_BondStake_Success() public {
        vm.prank(operator);
        registry.bondStake(MIN_BOND);

        assertTrue(registry.isSentinelActive(operator), "Operator must be active");
        SentinelNode memory node = registry.getSentinel(operator);
        assertEq(node.operator, operator);
        assertEq(node.bondedAmount, MIN_BOND);
        assertTrue(node.isActive);
        assertEq(node.successfulHedges, 0);
        assertEq(node.slashCount, 0);
        assertEq(aegisToken.balanceOf(address(registry)), MIN_BOND);
    }

    function test_BondStake_InsufficientInitialAmountReverts() public {
        vm.prank(operator);
        vm.expectRevert(InsufficientBondAmount.selector);
        registry.bondStake(MIN_BOND - 1);
    }

    function test_BondStake_ZeroAmountReverts() public {
        vm.prank(operator);
        vm.expectRevert(InsufficientBondAmount.selector);
        registry.bondStake(0);
    }

    function test_BondStake_IncrementalTopUp() public {
        vm.startPrank(operator);
        registry.bondStake(MIN_BOND);
        registry.bondStake(5_000 * 1e18);
        vm.stopPrank();

        SentinelNode memory node = registry.getSentinel(operator);
        assertEq(node.bondedAmount, MIN_BOND + 5_000 * 1e18);
        assertTrue(node.isActive);
    }

    function test_Unstake_PartialSuccess() public {
        vm.startPrank(operator);
        registry.bondStake(30_000 * 1e18);
        registry.unstake(5_000 * 1e18);

        // Tokens are in pending unbonding cooldown, not yet in operator wallet
        assertEq(aegisToken.balanceOf(operator), 100_000 * 1e18 - 30_000 * 1e18);
        assertEq(registry.pendingUnstakeAmounts(operator), 5_000 * 1e18);

        // Advance 7 days past cooldown and finalize
        vm.warp(block.timestamp + 7 days);
        registry.unstake(0);
        vm.stopPrank();

        SentinelNode memory node = registry.getSentinel(operator);
        assertEq(node.bondedAmount, MIN_BOND);
        assertTrue(registry.isSentinelActive(operator));
        assertEq(aegisToken.balanceOf(operator), 100_000 * 1e18 - MIN_BOND);
    }

    function test_SlashSentinel_CannotEvadeViaPartialUnstakeFrontrunning() public {
        vm.startPrank(operator);
        registry.bondStake(100_000 * 1e18);

        // Operator attempts frontrunning by unstaking 75,000 AEGIS down to MIN_BOND
        registry.unstake(75_000 * 1e18);
        vm.stopPrank();

        // Active bond is 25,000 AEGIS, but pending unbonding is 75,000 AEGIS
        assertEq(registry.getSentinel(operator).bondedAmount, MIN_BOND);
        assertEq(registry.pendingUnstakeAmounts(operator), 75_000 * 1e18);

        // Slasher executes slashing at 10% (1,000 bps)
        vm.prank(slasher);
        registry.slashSentinel(operator, victim, 1000, "SLA frontrunning attempt");

        // Full 10% penalty across total (100,000 * 10% = 10,000 AEGIS) is slashed
        assertEq(aegisToken.balanceOf(victim), 10_000 * 1e18, "Victim must receive full penalty across total stake");
        assertEq(registry.getSentinel(operator).bondedAmount, 15_000 * 1e18, "Bonded amount reduced by 10,000");
        assertEq(registry.pendingUnstakeAmounts(operator), 75_000 * 1e18, "Pending unstake intact after bonded absorption");
    }

    function test_Unstake_RevertIfRemainingBelowMinimum() public {
        vm.startPrank(operator);
        registry.bondStake(MIN_BOND);
        vm.expectRevert(InsufficientBondAmount.selector);
        registry.unstake(1 ether);
        vm.stopPrank();
    }

    function test_ExitSentinel_Success() public {
        vm.startPrank(operator);
        registry.bondStake(MIN_BOND);

        // Initiate exit
        registry.exitSentinel();

        // Immediately deactivated and cooldown active
        assertFalse(registry.isSentinelActive(operator));
        assertEq(registry.unbondingTimestamps(operator), block.timestamp + 7 days);
        assertEq(aegisToken.balanceOf(operator), 100_000 * 1e18 - MIN_BOND);

        // Warp 7 days
        vm.warp(block.timestamp + 7 days);

        // Finalize exit
        registry.exitSentinel();
        vm.stopPrank();

        assertFalse(registry.isSentinelActive(operator));
        SentinelNode memory node = registry.getSentinel(operator);
        assertEq(node.bondedAmount, 0);
        assertFalse(node.isActive);
        assertEq(aegisToken.balanceOf(operator), 100_000 * 1e18);
    }

    function test_ExitSentinel_ImmediateWithdrawalReverts() public {
        vm.startPrank(operator);
        registry.bondStake(MIN_BOND);
        registry.initiateExitSentinel();

        // Attempting to finalize exit immediately must revert with CooldownActive
        vm.expectRevert(abi.encodeWithSelector(CooldownActive.selector, block.timestamp + 7 days));
        registry.finalizeExitSentinel();

        // Attempting to call exitSentinel again immediately must revert with CooldownActive
        vm.expectRevert(abi.encodeWithSelector(CooldownActive.selector, block.timestamp + 7 days));
        registry.exitSentinel();
        vm.stopPrank();
    }

    function test_ExitSentinel_SlashingPossibleDuringCooldown() public {
        vm.prank(operator);
        registry.bondStake(MIN_BOND);

        // Operator attempts to front-run slash by initiating exit
        vm.prank(operator);
        registry.initiateExitSentinel();

        // Node is deactivated, but funds are STILL bonded in registry
        assertFalse(registry.isSentinelActive(operator));
        assertEq(registry.getSentinel(operator).bondedAmount, MIN_BOND);

        // Slasher slashes the node during the cooldown
        uint256 slashBps = 1000; // 10% = 2,500 * 1e18
        uint256 expectedSlash = (MIN_BOND * slashBps) / 10000;
        uint256 expectedRemaining = MIN_BOND - expectedSlash;

        vm.prank(slasher);
        registry.slashSentinel(operator, victim, slashBps, "Slash during unbonding cooldown");

        // Victim received restitution payout
        assertEq(aegisToken.balanceOf(victim), expectedSlash);
        assertEq(registry.getSentinel(operator).bondedAmount, expectedRemaining);

        // Advance 7 days past cooldown
        vm.warp(block.timestamp + 7 days);

        // Operator finalizes withdrawal, only receives remaining post-slash bond
        vm.prank(operator);
        registry.finalizeExitSentinel();

        assertEq(registry.getSentinel(operator).bondedAmount, 0);
        assertEq(aegisToken.balanceOf(operator), (100_000 * 1e18 - MIN_BOND) + expectedRemaining);
    }

    function test_ExitSentinel_RepeatedInitiateCannotResetTimer() public {
        vm.startPrank(operator);
        registry.bondStake(MIN_BOND);
        registry.initiateExitSentinel();

        uint256 initialUnlock = registry.unbondingTimestamps(operator);

        // Fast-forward 3 days
        vm.warp(block.timestamp + 3 days);

        // Attempting to initiate exit again must revert and cannot reset cooldown
        vm.expectRevert(abi.encodeWithSelector(CooldownActive.selector, initialUnlock));
        registry.initiateExitSentinel();

        assertEq(registry.unbondingTimestamps(operator), initialUnlock);
        vm.stopPrank();
    }

    function test_ExitSentinel_BoundaryTimestamps() public {
        vm.startPrank(operator);
        registry.bondStake(MIN_BOND);
        registry.initiateExitSentinel();

        uint256 unlockTime = registry.unbondingTimestamps(operator);

        // Exactly 1 second before unlock -> reverts
        vm.warp(unlockTime - 1);
        vm.expectRevert(abi.encodeWithSelector(CooldownActive.selector, unlockTime));
        registry.finalizeExitSentinel();

        // Exactly at unlockTime -> succeeds
        vm.warp(unlockTime);
        registry.finalizeExitSentinel();

        assertEq(registry.getSentinel(operator).bondedAmount, 0);
        assertEq(aegisToken.balanceOf(operator), 100_000 * 1e18);
        vm.stopPrank();
    }

    function test_ExitSentinel_CannotBondOrUnstakeDuringCooldown() public {
        vm.startPrank(operator);
        registry.bondStake(MIN_BOND);
        registry.initiateExitSentinel();

        uint256 unlockTime = registry.unbondingTimestamps(operator);

        // Cannot bond more stake during cooldown
        vm.expectRevert(abi.encodeWithSelector(CooldownActive.selector, unlockTime));
        registry.bondStake(1 ether);

        // Cannot call unstake during cooldown
        vm.expectRevert(abi.encodeWithSelector(CooldownActive.selector, unlockTime));
        registry.unstake(1 ether);
        vm.stopPrank();
    }

    function test_FinalizeExit_RevertsIfNoUnbondRequest() public {
        vm.startPrank(operator);
        registry.bondStake(MIN_BOND);

        // Has not initiated unbonding
        vm.expectRevert(NoUnbondRequest.selector);
        registry.finalizeExitSentinel();
        vm.stopPrank();
    }

    function test_SlashSentinel_SuccessAndVictimPayout() public {
        vm.prank(operator);
        registry.bondStake(MIN_BOND);

        uint256 slashBps = 1000; // 10% (Invariant INV-2 max bound)
        uint256 expectedSlash = (MIN_BOND * slashBps) / 10000; // 2,500 * 1e18
        uint256 expectedRemaining = MIN_BOND - expectedSlash; // 22,500 * 1e18

        vm.prank(slasher);
        registry.slashSentinel(operator, victim, slashBps, "Latency breach");

        // Victim received restitution payout
        assertEq(aegisToken.balanceOf(victim), expectedSlash, "Victim must receive slashed bond");

        // Sentinel bonded amount decreased
        SentinelNode memory node = registry.getSentinel(operator);
        assertEq(node.bondedAmount, expectedRemaining);
        assertEq(node.slashCount, 1);

        // Node must be deactivated because remaining < MIN_BOND
        assertFalse(node.isActive, "Node must be deactivated when remaining < MIN_BOND");
        assertFalse(registry.isSentinelActive(operator));
    }

    function test_SlashSentinel_InvariantINV2_ExceedsMaxBoundReverts() public {
        vm.prank(operator);
        registry.bondStake(MIN_BOND);

        // 1001 bps = 10.01% -> must revert under INV-2
        vm.prank(slasher);
        vm.expectRevert(SlashExceedsMaxBound.selector);
        registry.slashSentinel(operator, victim, 1001, "Excessive penalty");
    }

    function testFuzz_SlashSentinel_InvariantINV2_CannotExceedTenPercent(uint256 slashBps) public {
        vm.assume(slashBps > 1000);

        vm.prank(operator);
        registry.bondStake(MIN_BOND);

        vm.prank(slasher);
        vm.expectRevert(SlashExceedsMaxBound.selector);
        registry.slashSentinel(operator, victim, slashBps, "Fuzz penalty");
    }

    function test_SlashSentinel_UnauthorizedCallerReverts() public {
        vm.prank(operator);
        registry.bondStake(MIN_BOND);

        vm.prank(unauthorized);
        vm.expectRevert(UnauthorizedCaller.selector);
        registry.slashSentinel(operator, victim, 500, "Unauthorized slash");
    }

    function test_SlashSentinel_ZeroAddressReverts() public {
        vm.prank(operator);
        registry.bondStake(MIN_BOND);

        vm.startPrank(slasher);
        vm.expectRevert(ZeroAddress.selector);
        registry.slashSentinel(address(0), victim, 500, "Zero operator");

        vm.expectRevert(ZeroAddress.selector);
        registry.slashSentinel(operator, address(0), 500, "Zero victim");
        vm.stopPrank();
    }

    function test_RecordSuccessfulHedge() public {
        vm.prank(operator);
        registry.bondStake(MIN_BOND);

        vm.prank(slasher);
        registry.recordSuccessfulHedge(operator);

        SentinelNode memory node = registry.getSentinel(operator);
        assertEq(node.successfulHedges, 1);
    }

    // =========================================================================
    // PHASE 1B.2: SENTINEL LIFECYCLE & RE-REGISTRATION REGRESSION TESTS
    // =========================================================================

    /**
     * @notice Proves complete lifecycle: registration -> active service -> exit -> cooldown -> withdrawal -> clean re-entry.
     */
    function test_SentinelLifecycle_ExitAndReRegistration_Success() public {
        // 1. Initial Registration
        vm.prank(operator);
        registry.bondStake(MIN_BOND);
        assertTrue(registry.isSentinelActive(operator), "Sentinel must be active initially");

        // 2. Active Service: hedge recorded
        vm.prank(slasher);
        registry.recordSuccessfulHedge(operator);
        assertEq(registry.getSentinel(operator).successfulHedges, 1);

        // 3. Initiate Exit
        vm.prank(operator);
        registry.initiateExitSentinel();
        assertFalse(registry.isSentinelActive(operator), "Must deactivate immediately upon exit initiation");
        assertEq(registry.unbondingTimestamps(operator), block.timestamp + 7 days);

        // 4. Cannot re-register while cooldown is active
        vm.prank(operator);
        vm.expectRevert(abi.encodeWithSelector(CooldownActive.selector, block.timestamp + 7 days));
        registry.bondStake(MIN_BOND);

        // 5. Cooldown elapses and exit is finalized
        vm.warp(block.timestamp + 7 days);
        vm.prank(operator);
        registry.finalizeExitSentinel();

        assertEq(registry.unbondingTimestamps(operator), 0, "Unbonding timestamp must be cleared");
        assertEq(registry.getSentinel(operator).bondedAmount, 0, "Bonded amount must be zero after finalization");
        assertFalse(registry.getSentinel(operator).isActive, "Must remain inactive post-withdrawal");
        assertEq(aegisToken.balanceOf(operator), 100_000 * 1e18, "Full bond returned to operator");

        // 6. Honest Re-entry / Re-registration
        vm.prank(operator);
        registry.bondStake(MIN_BOND);

        // Verify active state and preserved telemetry
        assertTrue(registry.isSentinelActive(operator), "Sentinel must be active after re-registration");
        SentinelNode memory reNode = registry.getSentinel(operator);
        assertEq(reNode.operator, operator);
        assertEq(reNode.bondedAmount, MIN_BOND);
        assertTrue(reNode.isActive);
        assertEq(reNode.successfulHedges, 1, "Historical hedge telemetry must be preserved");
        assertEq(reNode.slashCount, 0, "Slash count remains 0 for clean sentinel");
        assertEq(aegisToken.balanceOf(address(registry)), MIN_BOND, "Registry must custody exact active bond");
        assertEq(aegisToken.balanceOf(operator), 100_000 * 1e18 - MIN_BOND);
    }

    /**
     * @notice Proves that re-entry following a previous slash preserves cumulative slashCount and does not wipe penalty history.
     */
    function test_SentinelLifecycle_ReRegistration_PreservesHistoricalSlashCount() public {
        // 1. Initial Registration
        vm.prank(operator);
        registry.bondStake(MIN_BOND);

        // 2. Active Service: Slashed for latency breach (10% = 2,500 AEGIS)
        vm.prank(slasher);
        registry.slashSentinel(operator, victim, 1000, "Active SLA breach");
        assertEq(registry.getSentinel(operator).slashCount, 1);
        assertEq(registry.getSentinel(operator).bondedAmount, 22_500 * 1e18);
        assertFalse(registry.getSentinel(operator).isActive, "Deactivated due to bond < MIN_BOND");

        // 3. Initiate Exit with remaining bond
        vm.prank(operator);
        registry.initiateExitSentinel();

        // 4. Slashed again during 7-day cooldown (10% of 22,500 = 2,250 AEGIS)
        vm.prank(slasher);
        registry.slashSentinel(operator, victim, 1000, "Cooldown SLA breach");
        assertEq(registry.getSentinel(operator).slashCount, 2);
        assertEq(registry.getSentinel(operator).bondedAmount, 20_250 * 1e18);

        // 5. Cooldown expires and exit finalized
        vm.warp(block.timestamp + 7 days);
        vm.prank(operator);
        registry.finalizeExitSentinel();
        assertEq(registry.getSentinel(operator).bondedAmount, 0);

        // 6. Re-registration: Operator deposits fresh MIN_BOND (25,000 AEGIS)
        vm.prank(operator);
        registry.bondStake(MIN_BOND);

        // 7. Verify: Historical slashCount (2) is strictly preserved, NOT reset to 0
        SentinelNode memory reNode = registry.getSentinel(operator);
        assertEq(reNode.slashCount, 2, "Cumulative historical slashCount must not be wiped upon re-entry");
        assertEq(reNode.bondedAmount, MIN_BOND, "Fresh bond must equal MIN_BOND");
        assertTrue(reNode.isActive, "Sentinel is active with full fresh bond at risk");
        assertTrue(registry.isSentinelActive(operator));

        // 8. Slashing the newly bonded sentinel works immediately
        vm.prank(slasher);
        registry.slashSentinel(operator, victim, 1000, "Subsequent violation on new bond");
        assertEq(registry.getSentinel(operator).slashCount, 3, "SlashCount increments monotonically");
        assertEq(registry.getSentinel(operator).bondedAmount, 22_500 * 1e18);
    }

    /**
     * @notice Proves that slashing cannot be executed once unbonding is finalized (post-withdrawal obligation gap),
     *         and that such obligations must be prosecuted during the 7-day cooldown window.
     */
    function test_SentinelLifecycle_SlashingObligation_CannotSlashAfterWithdrawal() public {
        vm.startPrank(operator);
        registry.bondStake(MIN_BOND);
        registry.initiateExitSentinel();
        vm.warp(block.timestamp + 7 days);
        registry.finalizeExitSentinel();
        vm.stopPrank();

        assertEq(registry.getSentinel(operator).bondedAmount, 0);

        // Slasher attempts to slash post-withdrawal
        vm.prank(slasher);
        vm.expectRevert(InsufficientBondAmount.selector);
        registry.slashSentinel(operator, victim, 1000, "Late SLA detection post-withdrawal");
    }

    /**
     * @notice Proves that repeated initiate or finalize calls after completion revert and cannot corrupt registry state.
     */
    function test_SentinelLifecycle_RepeatedExitCallsDoNotCorruptState() public {
        vm.startPrank(operator);
        registry.bondStake(MIN_BOND);
        registry.exitSentinel(); // First call: initiates unbonding
        vm.warp(block.timestamp + 7 days);
        registry.exitSentinel(); // Second call: finalizes exit
        vm.stopPrank();

        assertEq(registry.getSentinel(operator).bondedAmount, 0);
        assertEq(registry.unbondingTimestamps(operator), 0);

        // Calling exitSentinel again with 0 bond reverts
        vm.prank(operator);
        vm.expectRevert(InsufficientBondAmount.selector);
        registry.exitSentinel();

        // Calling initiateExitSentinel again with 0 bond reverts
        vm.prank(operator);
        vm.expectRevert(InsufficientBondAmount.selector);
        registry.initiateExitSentinel();

        // Calling finalizeExitSentinel again reverts because no unbond request exists
        vm.prank(operator);
        vm.expectRevert(NoUnbondRequest.selector);
        registry.finalizeExitSentinel();

        assertEq(aegisToken.balanceOf(address(registry)), 0, "Registry balance must remain zero");
    }

    /**
     * @notice Proves that failed re-registration attempts (e.g. sub-minimum bond) revert cleanly without corrupting state.
     */
    function test_SentinelLifecycle_FailedReRegistrationDoesNotCorruptState() public {
        vm.startPrank(operator);
        registry.bondStake(MIN_BOND);
        registry.initiateExitSentinel();
        vm.warp(block.timestamp + 7 days);
        registry.finalizeExitSentinel();

        // Attempt to re-register with zero amount
        vm.expectRevert(InsufficientBondAmount.selector);
        registry.bondStake(0);

        // Attempt to re-register with less than MIN_BOND
        vm.expectRevert(InsufficientBondAmount.selector);
        registry.bondStake(MIN_BOND - 1);
        vm.stopPrank();

        // State remains pristine: zero bond, inactive, zero timestamp
        SentinelNode memory node = registry.getSentinel(operator);
        assertEq(node.bondedAmount, 0);
        assertFalse(node.isActive);
        assertEq(registry.unbondingTimestamps(operator), 0);
        assertFalse(registry.isSentinelActive(operator));
        assertEq(aegisToken.balanceOf(address(registry)), 0);
    }

    /**
     * @notice Proves that an operator cannot re-register even after the 7 days have passed if they haven't finalized exit.
     */
    function test_SentinelLifecycle_CannotReRegisterBeforeFinalizingEvenPastCooldown() public {
        vm.startPrank(operator);
        registry.bondStake(MIN_BOND);
        registry.initiateExitSentinel();

        uint256 unlockTimestamp = registry.unbondingTimestamps(operator);

        // Warp 8 days (past cooldown)
        vm.warp(block.timestamp + 8 days);

        // Attempting to bond stake before calling finalizeExitSentinel must revert with CooldownActive
        vm.expectRevert(abi.encodeWithSelector(CooldownActive.selector, unlockTimestamp));
        registry.bondStake(MIN_BOND);

        // Must finalize first
        registry.finalizeExitSentinel();

        // Now re-registration succeeds
        registry.bondStake(MIN_BOND);
        vm.stopPrank();

        assertTrue(registry.isSentinelActive(operator));
    }

    /**
     * @notice Proves that multiple consecutive exit and re-entry cycles preserve exact token accounting and INV-2 bounds.
     */
    function test_SentinelLifecycle_MultipleExitAndReRegistrationCycles() public {
        uint256 expectedOperatorBalance = 100_000 * 1e18;

        for (uint256 cycle = 0; cycle < 3; cycle++) {
            // Bond
            vm.prank(operator);
            registry.bondStake(MIN_BOND);
            assertTrue(registry.isSentinelActive(operator));

            // Slash once per cycle (500 bps = 5% = 1,250 AEGIS)
            uint256 slashAmount = (MIN_BOND * 500) / 10000;
            vm.prank(slasher);
            registry.slashSentinel(operator, victim, 500, "Cycle slash");

            // Initiate exit
            vm.prank(operator);
            registry.initiateExitSentinel();

            // Advance past cooldown
            vm.warp(block.timestamp + 7 days);

            // Finalize exit
            vm.prank(operator);
            registry.finalizeExitSentinel();

            expectedOperatorBalance -= slashAmount;
            assertEq(aegisToken.balanceOf(operator), expectedOperatorBalance);
        }

        // Total slashes across 3 cycles: 3 slashes
        assertEq(registry.getSentinel(operator).slashCount, 3);
        assertEq(aegisToken.balanceOf(victim), (MIN_BOND * 500 * 3) / 10000);
        assertEq(aegisToken.balanceOf(address(registry)), 0);
    }
}
