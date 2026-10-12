// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title IAscendHookPool
 * @notice Interface for Ascend Closed Hook Pools on Elysium L2 for automated buyback-and-burn swaps.
 */
interface IAscendHookPool {
    /**
     * @notice Swaps tokenIn for tokenOut.
     * @param tokenIn Address of token to swap in (e.g., USDC).
     * @param tokenOut Address of token to receive (e.g., $AEGIS).
     * @param amountIn Amount of tokenIn to swap.
     * @param minAmountOut Minimum acceptable amount of tokenOut.
     * @param recipient Recipient of swapped tokenOut.
     * @return amountOut Actual amount of tokenOut swapped.
     */
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) external returns (uint256 amountOut);
}
