// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IHyperCoreWriter} from "../interfaces/IHyperCoreWriter.sol";
import {PredeployWriteFailed} from "../AegisTypes.sol";

/**
 * @title PredeployCoreWriterAdapter
 * @notice Dispatches trade intents directly into Elysium Predeploy 0x0802 (ElysiumCoreWriter).
 * @dev Activated post-mainnet when the ArbOS network upgrade ships.
 */
contract PredeployCoreWriterAdapter is IHyperCoreWriter {
    address public constant PREDEPLOY_0x0802 = address(0x0802);

    function placeHedgeIntent(
        address vault,
        uint32 perpIndex,
        int256 size,
        uint256 limitPrice
    ) external override returns (bool success) {
        bool writeSuccess = IHyperCoreWriter(PREDEPLOY_0x0802).placeHedgeIntent(
            vault,
            perpIndex,
            size,
            limitPrice
        );
        if (!writeSuccess) revert PredeployWriteFailed();
        return true;
    }

    function cancelHedgeIntent(address vault, uint32 perpIndex) external override returns (bool success) {
        return IHyperCoreWriter(PREDEPLOY_0x0802).cancelHedgeIntent(vault, perpIndex);
    }
}
