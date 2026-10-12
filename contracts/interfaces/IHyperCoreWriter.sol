// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title IHyperCoreWriter
 * @notice Interface for Elysium Predeploy 0x0802 (ElysiumCoreWriter).
 * @dev Dispatches trade-only orders into HyperCore L1 CLOB matching engine with sub-second finality.
 */
interface IHyperCoreWriter {
    /**
     * @notice Emits an atomic signed trade intent to HyperCore keepers.
     * @param vault The user vault owner on whose behalf the order is placed.
     * @param perpIndex The perpetual market index on HyperCore.
     * @param size Signed size (positive for long, negative for short).
     * @param limitPrice Execution price limit scaled 1e8.
     * @return success True if the intent was captured by keeper pre-matching.
     */
    function placeHedgeIntent(
        address vault,
        uint32 perpIndex,
        int256 size,
        uint256 limitPrice
    ) external returns (bool success);

    /**
     * @notice Cancels a resting order intent on HyperCore.
     * @param vault The vault owner.
     * @param perpIndex The perpetual market index.
     */
    function cancelHedgeIntent(address vault, uint32 perpIndex) external returns (bool success);
}
