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
    ZeroAddress
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
        vm.stopPrank();

        SentinelNode memory node = registry.getSentinel(operator);
        assertEq(node.bondedAmount, MIN_BOND);
        assertTrue(registry.isSentinelActive(operator));
        assertEq(aegisToken.balanceOf(operator), 100_000 * 1e18 - MIN_BOND);
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
        registry.exitSentinel();
        vm.stopPrank();

        assertFalse(registry.isSentinelActive(operator));
        SentinelNode memory node = registry.getSentinel(operator);
        assertEq(node.bondedAmount, 0);
        assertFalse(node.isActive);
        assertEq(aegisToken.balanceOf(operator), 100_000 * 1e18);
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
}
