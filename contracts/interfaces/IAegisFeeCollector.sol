// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title IAegisFeeCollector
 * @notice External interface for the AEGIS 50/50 Flywheel Fee Collector contract.
 */
interface IAegisFeeCollector {
    event FeeProcessed(
        address indexed vaultOwner,
        uint256 savedPenaltyAmount,
        uint256 feeAmountUsdc,
        uint256 buybackBudget,
        uint256 yieldBudget
    );
    event BuybackAndBurnExecuted(uint256 usdcSpent, uint256 aegisBurned);
    event YieldDistributed(address indexed recipient, uint256 yieldAmount);
    event TargetUpdated(address indexed newTarget);
    event PoolUpdated(address indexed newPool);

    function processAvertedFee(address vaultOwner, uint256 savedPenaltyAmount) external;
    function executeBuybackAndBurn() external;
    function executeBuybackAndBurn(uint256 minAegisOut) external;
    function distributeYield() external;
    function claimYield() external;

    function buybackBudget() external view returns (uint256);
    function yieldBudget() external view returns (uint256);
    function totalFeesCaptured() external view returns (uint256);
    function totalBurnedFees() external view returns (uint256);
    function totalDistributedYield() external view returns (uint256);
    function totalAegisBurned() external view returns (uint256);
}
