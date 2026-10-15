// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title IHyperCoreOracle
 * @notice Standard interface for HyperCore market price feed adapters in AEGIS Protocol.
 * @dev Decouples the vault risk engine from underlying precompiles or relayed price networks.
 */
interface IHyperCoreOracle {
    /**
     * @notice Returns the perpetual mark price scaled to 1e8 USD.
     * @param perpIndex The market index on HyperCore (e.g., 0 for HYPE-PERP).
     * @return markPrice Mark price scaled to 1e8 USD.
     */
    function getPerpPrice(uint32 perpIndex) external view returns (uint256 markPrice);

    /**
     * @notice Returns the perpetual mark price and observation timestamp.
     * @param perpIndex The market index on HyperCore.
     * @return markPrice Mark price scaled to 1e8 USD.
     * @return timestamp Observation timestamp in seconds.
     */
    function getPerpPriceWithTimestamp(uint32 perpIndex) external view returns (uint256 markPrice, uint256 timestamp);
}
