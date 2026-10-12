// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title MockHyperCorePrecompile
 * @notice Mock implementation of HyperCore Precompile 0x0801 for local Foundry testing.
 * @dev Returns simulated mark prices for perpetual indices when queried with selector 0x3a4b9c1d.
 */
contract MockHyperCorePrecompile {
    mapping(uint32 => uint256) public prices;
    bool public shouldRevert;
    bool public returnShortData;

    function setMockPrice(uint32 perpIndex, uint256 price) external {
        prices[perpIndex] = price;
    }

    function setShouldRevert(bool _revert) external {
        shouldRevert = _revert;
    }

    function setReturnShortData(bool _short) external {
        returnShortData = _short;
    }

    function getMockPrice(uint32 perpIndex) external view returns (uint256) {
        return prices[perpIndex];
    }

    fallback(bytes calldata data) external returns (bytes memory) {
        if (shouldRevert) {
            revert("MockHyperCorePrecompile: forced revert");
        }
        if (returnShortData) {
            return hex"1234";
        }
        if (data.length >= 4 && bytes4(data[:4]) == bytes4(0x3a4b9c1d)) {
            uint32 perpIndex = abi.decode(data[4:], (uint32));
            return abi.encode(prices[perpIndex]);
        }
        return "";
    }
}
