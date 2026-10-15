// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {
    SentinelNode,
    InsufficientBondAmount,
    UnauthorizedCaller,
    SlashExceedsMaxBound,
    ZeroAddress,
    CooldownActive,
    NoUnbondRequest
} from "./AegisTypes.sol";
import {IAegisSentinelRegistry} from "./interfaces/IAegisSentinelRegistry.sol";

/**
 * @title AegisSentinelRegistry
 * @notice Staking and SLA enforcement registry for AEGIS Sentinel keeper nodes.
 * @dev Enforces a strict minimum bond of 25,000 $AEGIS tokens, a 7-day unbonding cooldown,
 *      and Invariant INV-2 (slashing <= 10%).
 */
contract AegisSentinelRegistry is IAegisSentinelRegistry, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @notice Minimum bond required to activate and maintain a Sentinel node (25,000 * 1e18)
    uint256 public constant MIN_BOND = 25_000 * 1e18;

    /// @notice Invariant INV-2: Maximum permissible slashing penalty (1000 bps = 10%)
    uint256 public constant MAX_SLASH_BPS = 1000;

    /// @notice 7-day unbonding delay preventing front-running slashing evasion
    uint256 public constant UNBONDING_COOLDOWN = 7 days;

    /// @notice The $AEGIS governance/staking token
    IERC20 public immutable aegisToken;

    /// @notice Authorized slasher or vault contracts
    mapping(address => bool) public authorizedSlashers;

    /// @notice Registry of Sentinel nodes mapped by operator address
    mapping(address => SentinelNode) public sentinels;

    /// @notice Cooldown unlock timestamp per operator when unbonding is initiated
    mapping(address => uint256) public override unbondingTimestamps;

    modifier onlySlasherOrOwner() {
        if (msg.sender != owner() && !authorizedSlashers[msg.sender]) {
            revert UnauthorizedCaller();
        }
        _;
    }

    constructor(address _aegisToken, address initialOwner) Ownable(initialOwner) {
        if (_aegisToken == address(0)) revert ZeroAddress();
        aegisToken = IERC20(_aegisToken);
    }

    /**
     * @notice Authorize or revoke an address permitted to slash or record hedges.
     * @param slasher Address of slasher/vault.
     * @param authorized True if authorized.
     */
    function setAuthorizedSlasher(address slasher, bool authorized) external onlyOwner {
        if (slasher == address(0)) revert ZeroAddress();
        authorizedSlashers[slasher] = authorized;
    }

    /**
     * @notice Deposit $AEGIS tokens to bond and activate a Sentinel node.
     * @param amount Token amount to bond.
     */
    function bondStake(uint256 amount) external nonReentrant {
        if (amount == 0) revert InsufficientBondAmount();
        if (unbondingTimestamps[msg.sender] != 0) revert CooldownActive(unbondingTimestamps[msg.sender]);

        SentinelNode storage node = sentinels[msg.sender];
        uint256 newBond = node.bondedAmount + amount;

        if (newBond < MIN_BOND) {
            revert InsufficientBondAmount();
        }

        node.operator = msg.sender;
        node.bondedAmount = newBond;
        node.isActive = true;

        aegisToken.safeTransferFrom(msg.sender, address(this), amount);

        emit SentinelBonded(msg.sender, amount, newBond);
    }

    /**
     * @notice Withdraw excess bonded tokens while retaining active node status.
     * @dev Enforces remaining bond >= 25,000 * 1e18.
     * @param amount Token amount to unstake.
     */
    function unstake(uint256 amount) external nonReentrant {
        if (unbondingTimestamps[msg.sender] != 0) revert CooldownActive(unbondingTimestamps[msg.sender]);

        SentinelNode storage node = sentinels[msg.sender];
        if (amount == 0 || node.bondedAmount < amount) {
            revert InsufficientBondAmount();
        }

        uint256 remaining = node.bondedAmount - amount;
        if (remaining < MIN_BOND) {
            revert InsufficientBondAmount();
        }

        node.bondedAmount = remaining;
        aegisToken.safeTransfer(msg.sender, amount);

        emit SentinelUnstaked(msg.sender, amount, remaining);
    }

    /**
     * @notice Initiates the 7-day unbonding cooldown, immediately deactivating the node.
     * @dev Bonded funds remain locked in the contract and remain slashable throughout the cooldown.
     */
    function initiateExitSentinel() public nonReentrant {
        SentinelNode storage node = sentinels[msg.sender];
        if (node.bondedAmount == 0) revert InsufficientBondAmount();
        if (unbondingTimestamps[msg.sender] != 0) revert CooldownActive(unbondingTimestamps[msg.sender]);

        node.isActive = false;
        uint256 unlockTimestamp = block.timestamp + UNBONDING_COOLDOWN;
        unbondingTimestamps[msg.sender] = unlockTimestamp;

        emit SentinelDeactivated(msg.sender);
        emit SentinelExitInitiated(msg.sender, unlockTimestamp);
    }

    /**
     * @notice Finalizes exit after the 7-day cooldown elapses, withdrawing remaining bonded tokens.
     */
    function finalizeExitSentinel() public nonReentrant {
        uint256 unlockTime = unbondingTimestamps[msg.sender];
        if (unlockTime == 0) revert NoUnbondRequest();
        if (block.timestamp < unlockTime) revert CooldownActive(unlockTime);

        SentinelNode storage node = sentinels[msg.sender];
        uint256 amount = node.bondedAmount;

        delete unbondingTimestamps[msg.sender];
        node.bondedAmount = 0;

        if (amount > 0) {
            aegisToken.safeTransfer(msg.sender, amount);
        }

        emit SentinelExitFinalized(msg.sender, amount);
        emit SentinelUnstaked(msg.sender, amount, 0);
    }

    /**
     * @notice Deactivates the caller's node and unbonds tokens through the 7-day cooldown.
     * @dev Initiates unbonding on first call; finalizes withdrawal after 7 days have elapsed.
     */
    function exitSentinel() external nonReentrant {
        uint256 unlockTime = unbondingTimestamps[msg.sender];
        if (unlockTime == 0) {
            SentinelNode storage node = sentinels[msg.sender];
            if (node.bondedAmount == 0) revert InsufficientBondAmount();

            node.isActive = false;
            uint256 unlockTimestamp = block.timestamp + UNBONDING_COOLDOWN;
            unbondingTimestamps[msg.sender] = unlockTimestamp;

            emit SentinelDeactivated(msg.sender);
            emit SentinelExitInitiated(msg.sender, unlockTimestamp);
        } else {
            if (block.timestamp < unlockTime) revert CooldownActive(unlockTime);

            SentinelNode storage node = sentinels[msg.sender];
            uint256 amount = node.bondedAmount;

            delete unbondingTimestamps[msg.sender];
            node.bondedAmount = 0;

            if (amount > 0) {
                aegisToken.safeTransfer(msg.sender, amount);
            }

            emit SentinelExitFinalized(msg.sender, amount);
            emit SentinelUnstaked(msg.sender, amount, 0);
        }
    }

    /**
     * @notice Penalizes a malfunctioning or malicious Sentinel node.
     * @dev Invariant INV-2: slashBps cannot exceed 1000 (10%). Slashing proceeds are paid directly to victim.
     * @param operator The Sentinel operator being slashed.
     * @param victim The vault owner or affected counterparty receiving the restitution payout.
     * @param slashBps Basis points to slash (1000 max = 10%).
     * @param reason Human-readable reason for SLA violation.
     */
    function slashSentinel(
        address operator,
        address victim,
        uint256 slashBps,
        string calldata reason
    ) external onlySlasherOrOwner nonReentrant {
        if (operator == address(0) || victim == address(0)) revert ZeroAddress();
        if (slashBps > MAX_SLASH_BPS) revert SlashExceedsMaxBound();

        SentinelNode storage node = sentinels[operator];
        if (node.bondedAmount == 0) revert InsufficientBondAmount();

        uint256 slashAmount = (node.bondedAmount * slashBps) / 10000;
        node.bondedAmount -= slashAmount;
        node.slashCount += 1;

        if (node.bondedAmount < MIN_BOND) {
            node.isActive = false;
            emit SentinelDeactivated(operator);
        }

        aegisToken.safeTransfer(victim, slashAmount);

        emit SentinelSlashed(operator, victim, slashBps, slashAmount, reason);
    }

    /**
     * @notice Records a successful hedge execution by an authorized sentinel.
     * @param operator The sentinel operator address.
     */
    function recordSuccessfulHedge(address operator) external onlySlasherOrOwner {
        if (operator == address(0)) revert ZeroAddress();
        SentinelNode storage node = sentinels[operator];
        node.successfulHedges += 1;
        emit HedgeRecorded(operator, node.successfulHedges);
    }

    /**
     * @notice Query whether an operator has an active Sentinel node meeting the bond minimum.
     * @param operator The node operator address.
     */
    function isSentinelActive(address operator) external view returns (bool) {
        return sentinels[operator].isActive && sentinels[operator].bondedAmount >= MIN_BOND && unbondingTimestamps[operator] == 0;
    }

    /**
     * @notice Query full Sentinel node details.
     * @param operator The node operator address.
     */
    function getSentinel(address operator) external view returns (SentinelNode memory) {
        return sentinels[operator];
    }
}
