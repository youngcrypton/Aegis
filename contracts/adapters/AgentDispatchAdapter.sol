// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IHyperCoreWriter} from "../interfaces/IHyperCoreWriter.sol";
import {ZeroAddress, UnauthorizedCaller} from "../AegisTypes.sol";

/**
 * @title AgentDispatchAdapter
 * @notice Stock ArbOS trade dispatch adapter for AEGIS Protocol.
 * @dev Emits verifiable on-chain events that the off-chain Sentinel Keeper captures
 *      and submits to HyperCore L1 as an authorized trade-only agent on the user's account.
 *      Enforces INV-1: Agents cannot transfer/withdraw funds.
 */
contract AgentDispatchAdapter is IHyperCoreWriter, Ownable {
    /// @notice Authorized callers (e.g., AegisVault)
    mapping(address => bool) public authorizedCallers;

    event AgentHedgeIntentDispatched(
        address indexed vault,
        uint32 indexed perpIndex,
        int256 size,
        uint256 limitPrice,
        uint256 timestamp
    );

    event AgentHedgeIntentCancelled(
        address indexed vault,
        uint32 indexed perpIndex,
        uint256 timestamp
    );

    event CallerAuthorized(address indexed caller, bool authorized);

    modifier onlyAuthorized() {
        if (!authorizedCallers[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedCaller();
        }
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        if (caller == address(0)) revert ZeroAddress();
        authorizedCallers[caller] = authorized;
        emit CallerAuthorized(caller, authorized);
    }

    function placeHedgeIntent(
        address vault,
        uint32 perpIndex,
        int256 size,
        uint256 limitPrice
    ) external override onlyAuthorized returns (bool success) {
        emit AgentHedgeIntentDispatched(vault, perpIndex, size, limitPrice, block.timestamp);
        return true;
    }

    function cancelHedgeIntent(
        address vault,
        uint32 perpIndex
    ) external override onlyAuthorized returns (bool success) {
        emit AgentHedgeIntentCancelled(vault, perpIndex, block.timestamp);
        return true;
    }
}
