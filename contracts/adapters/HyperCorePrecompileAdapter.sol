// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IHyperCoreOracle} from "../interfaces/IHyperCoreOracle.sol";
import {PrecompileReadFailed} from "../AegisTypes.sol";

/**
 * @title HyperCorePrecompileAdapter
 * @notice Queries Elysium Precompile 0x0801 for live HyperCore CLOB prices.
 * @dev Intended for production use once the ArbOS network upgrade ships (~4 weeks post-mainnet).
 */
contract HyperCorePrecompileAdapter is IHyperCoreOracle {
    address public constant PRECOMPILE_0x0801 = address(0x0801);
    bytes4 public constant SELECTOR = 0x3a4b9c1d;

    /**
     * @notice Query the live perpetual mark price from HyperCore L1 Precompile.
     * @param perpIndex Market identifier (e.g., 0 for HYPE-PERP).
     * @return markPrice Mark price scaled to 1e8 USD.
     */
    function getPerpPrice(uint32 perpIndex) external view override returns (uint256 markPrice) {
        bytes memory payload = abi.encodeWithSelector(SELECTOR, perpIndex);
        (bool success, bytes memory returnData) = PRECOMPILE_0x0801.staticcall(payload);
        if (!success || returnData.length < 32) {
            revert PrecompileReadFailed(perpIndex);
        }
        return abi.decode(returnData, (uint256));
    }

    /**
     * @notice Query the live price and observation timestamp.
     */
    function getPerpPriceWithTimestamp(uint32 perpIndex) external view override returns (uint256 markPrice, uint256 timestamp) {
        bytes memory payload = abi.encodeWithSelector(SELECTOR, perpIndex);
        (bool success, bytes memory returnData) = PRECOMPILE_0x0801.staticcall(payload);
        if (!success || returnData.length < 32) {
            revert PrecompileReadFailed(perpIndex);
        }
        markPrice = abi.decode(returnData, (uint256));
        timestamp = block.timestamp;
    }
}
