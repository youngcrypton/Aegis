// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IHyperCoreWriter} from "../../contracts/interfaces/IHyperCoreWriter.sol";

/**
 * @title MockHyperCoreWriter
 * @notice Mock implementation of Elysium Predeploy 0x0802 for local Foundry testing.
 * @dev Records received orders and cancellation requests.
 */
contract MockHyperCoreWriter is IHyperCoreWriter {
    struct OrderIntent {
        address vault;
        uint32 perpIndex;
        int256 size;
        uint256 limitPrice;
        uint256 timestamp;
    }

    OrderIntent[] public recordedIntents;
    mapping(address => OrderIntent[]) public intentsByVault;
    mapping(address => mapping(uint32 => bool)) public cancelledIntents;

    bool public shouldFail;

    function setShouldFail(bool _fail) external {
        shouldFail = _fail;
    }

    function placeHedgeIntent(
        address vault,
        uint32 perpIndex,
        int256 size,
        uint256 limitPrice
    ) external override returns (bool success) {
        if (shouldFail) {
            return false;
        }

        OrderIntent memory intent = OrderIntent({
            vault: vault,
            perpIndex: perpIndex,
            size: size,
            limitPrice: limitPrice,
            timestamp: block.timestamp
        });

        recordedIntents.push(intent);
        intentsByVault[vault].push(intent);
        return true;
    }

    function cancelHedgeIntent(address vault, uint32 perpIndex) external override returns (bool success) {
        if (shouldFail) {
            return false;
        }
        cancelledIntents[vault][perpIndex] = true;
        return true;
    }

    function getRecordedIntentsCount() external view returns (uint256) {
        return recordedIntents.length;
    }

    function getLastIntent() external view returns (OrderIntent memory) {
        require(recordedIntents.length > 0, "No intents recorded");
        return recordedIntents[recordedIntents.length - 1];
    }
}
