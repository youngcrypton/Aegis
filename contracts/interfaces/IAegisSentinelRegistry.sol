// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {SentinelNode} from "../AegisTypes.sol";

/**
 * @title IAegisSentinelRegistry
 * @notice Interface for the AEGIS Sentinel node staking, SLA enforcement, and slashing registry.
 */
interface IAegisSentinelRegistry {
    event SentinelBonded(address indexed operator, uint256 amount, uint256 totalBonded);
    event SentinelUnstaked(address indexed operator, uint256 amount, uint256 remainingBond);
    event SentinelSlashed(
        address indexed operator,
        address indexed victim,
        uint256 slashBps,
        uint256 slashAmount,
        string reason
    );
    event SentinelDeactivated(address indexed operator);
    event SentinelExitInitiated(address indexed operator, uint256 unlockTimestamp);
    event SentinelExitFinalized(address indexed operator, uint256 amount);
    event HedgeRecorded(address indexed operator, uint32 totalSuccessful);

    function bondStake(uint256 amount) external;
    function unstake(uint256 amount) external;
    function initiateExitSentinel() external;
    function finalizeExitSentinel() external;
    function exitSentinel() external;
    function slashSentinel(
        address operator,
        address victim,
        uint256 slashBps,
        string calldata reason
    ) external;
    function recordSuccessfulHedge(address operator) external;
    function isSentinelActive(address operator) external view returns (bool);
    function getSentinel(address operator) external view returns (SentinelNode memory);
    function unbondingTimestamps(address operator) external view returns (uint256);
    function MIN_BOND() external view returns (uint256);
    function MAX_SLASH_BPS() external view returns (uint256);
    function UNBONDING_COOLDOWN() external view returns (uint256);
}
