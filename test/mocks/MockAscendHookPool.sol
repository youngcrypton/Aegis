// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IAscendHookPool} from "../../contracts/interfaces/IAscendHookPool.sol";

/**
 * @title MockAscendHookPool
 * @notice Mock implementation of Ascend Closed Hook AMM Pool on Elysium L2 for tests.
 */
contract MockAscendHookPool is IAscendHookPool {
    using SafeERC20 for IERC20;

    // Rate: 1 USDC (1e6) = 10 AEGIS (10e18) -> rateMultiplier = 10 * 1e12
    uint256 public rateMultiplier = 10 * 1e12;
    bool public shouldFail;

    function setRateMultiplier(uint256 _rateMultiplier) external {
        rateMultiplier = _rateMultiplier;
    }

    function setShouldFail(bool _shouldFail) external {
        shouldFail = _shouldFail;
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        address recipient
    ) external override returns (uint256 amountOut) {
        if (shouldFail) revert("MockAscendHookPool: forced failure");

        // Pull tokenIn from msg.sender (AegisFeeCollector)
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Calculate amountOut based on rateMultiplier
        amountOut = amountIn * rateMultiplier;
        require(amountOut >= minAmountOut, "MockAscendHookPool: slippage exceeded");

        // Send tokenOut to recipient
        IERC20(tokenOut).safeTransfer(recipient, amountOut);
        return amountOut;
    }
}
