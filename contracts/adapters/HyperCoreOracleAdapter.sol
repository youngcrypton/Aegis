// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {PrecompileReadFailed} from "../AegisTypes.sol";

/**
 * @title HyperCoreOracleAdapter
 * @notice Low-level staticcall library querying HyperCore L1 EVM Precompile 0x0801.
 * @dev Precompile 0x0801 provides synchronous, zero-gas mark prices and orderbook depth.
 */
library HyperCoreOracleAdapter {
    address internal constant PRECOMPILE_0x0801 = address(0x0801);

    /**
     * @notice Query the live perpetual mark price from HyperCore L1.
     * @param perpIndex The market index on HyperCore (e.g., 0 for HYPE-PERP).
     * @return markPrice Mark price scaled to 1e8 USD.
     */
    function getPerpPrice(uint32 perpIndex) internal view returns (uint256 markPrice) {
        bytes memory payload = abi.encodeWithSelector(0x3a4b9c1d, perpIndex);
        (bool success, bytes memory returnData) = PRECOMPILE_0x0801.staticcall(payload);
        if (!success || returnData.length < 32) {
            revert PrecompileReadFailed(perpIndex);
        }
        return abi.decode(returnData, (uint256));
    }
}
