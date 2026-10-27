// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ZeroAddress, UnauthorizedCaller} from "./AegisTypes.sol";
import {IAegisFeeCollector} from "./interfaces/IAegisFeeCollector.sol";
import {IAscendHookPool} from "./interfaces/IAscendHookPool.sol";

/**
 * @title AegisFeeCollector
 * @notice 50/50 Flywheel engine capturing a 10% performance fee on averted liquidation penalties.
 * @dev Enforces Invariant INV-4: exact 50% buyback-and-burn allocation and 50% staker yield allocation.
 */
contract AegisFeeCollector is IAegisFeeCollector, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @notice Performance fee on saved liquidation penalty: 1,000 bps = 10%
    uint256 public constant PROTOCOL_FEE_BPS = 1000;

    /// @notice Address where burned $AEGIS is permanently destroyed
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    /// @notice USDC accounting token
    IERC20 public immutable usdcToken;

    /// @notice $AEGIS protocol token
    IERC20 public immutable aegisToken;

    /// @notice Ascend Closed Hook AMM pool
    IAscendHookPool public ascendHookPool;

    /// @notice Staking contract or reward distributor receiving real yield
    address public yieldDistributionTarget;

    /// @notice Authorized vault contracts permitted to process fees
    mapping(address => bool) public authorizedVaults;

    /// @notice Accumulator budgets
    uint256 public override buybackBudget;
    uint256 public override yieldBudget;

    /// @notice Minimum AEGIS tokens per 1 USDC (scaled 1e18 per 1e6 USDC) required for buyback swaps.
    /// @dev If set > 0, enforces minimum tokens received even if caller passes minAegisOut = 0.
    uint256 public minBuybackRate;

    /// @notice Lifetime metric counters
    uint256 public override totalFeesCaptured;
    uint256 public override totalBurnedFees;
    uint256 public override totalDistributedYield;
    uint256 public override totalAegisBurned;

    event MinBuybackRateUpdated(uint256 oldRate, uint256 newRate);

    error ZeroAmount();
    error InsufficientBudget();

    modifier onlyVaultOrOwner() {
        if (msg.sender != owner() && !authorizedVaults[msg.sender]) {
            revert UnauthorizedCaller();
        }
        _;
    }

    constructor(
        address _usdcToken,
        address _aegisToken,
        address _ascendHookPool,
        address _yieldDistributionTarget,
        address initialOwner
    ) Ownable(initialOwner) {
        if (_usdcToken == address(0) || _aegisToken == address(0)) revert ZeroAddress();
        if (_ascendHookPool == address(0) || _yieldDistributionTarget == address(0)) revert ZeroAddress();

        usdcToken = IERC20(_usdcToken);
        aegisToken = IERC20(_aegisToken);
        ascendHookPool = IAscendHookPool(_ascendHookPool);
        yieldDistributionTarget = _yieldDistributionTarget;
    }

    /**
     * @notice Authorize or revoke a vault contract permitted to report fees.
     */
    function setAuthorizedVault(address vault, bool authorized) external onlyOwner {
        if (vault == address(0)) revert ZeroAddress();
        authorizedVaults[vault] = authorized;
    }

    /**
     * @notice Update the Ascend Hook Pool address.
     */
    function setAscendHookPool(address newPool) external onlyOwner {
        if (newPool == address(0)) revert ZeroAddress();
        ascendHookPool = IAscendHookPool(newPool);
        emit PoolUpdated(newPool);
    }

    /**
     * @notice Update the yield distribution target contract.
     */
    function setYieldDistributionTarget(address newTarget) external onlyOwner {
        if (newTarget == address(0)) revert ZeroAddress();
        yieldDistributionTarget = newTarget;
        emit TargetUpdated(newTarget);
    }

    /**
     * @notice Set minimum AEGIS rate per 1 USDC to protect against sandwich / MEV slippage.
     * @param _minBuybackRate Minimum AEGIS (1e18) per 1 USDC (1e6).
     */
    function setMinBuybackRate(uint256 _minBuybackRate) external onlyOwner {
        emit MinBuybackRateUpdated(minBuybackRate, _minBuybackRate);
        minBuybackRate = _minBuybackRate;
    }

    /**
     * @notice Processes a 10% fee on an averted liquidation penalty and splits it 50/50.
     * @dev Enforces Invariant INV-4: exact 50/50 division with zero rounding leakage.
     * @param vaultOwner The vault borrower that saved the penalty.
     * @param savedPenaltyAmount The saved liquidation penalty in USDC (scaled 1e6).
     */
    function processAvertedFee(
        address vaultOwner,
        uint256 savedPenaltyAmount
    ) external override onlyVaultOrOwner nonReentrant {
        if (savedPenaltyAmount == 0) revert ZeroAmount();
        if (vaultOwner == address(0)) revert ZeroAddress();

        uint256 fee = (savedPenaltyAmount * PROTOCOL_FEE_BPS) / 10000;
        if (fee == 0) revert ZeroAmount();

        // Transfer USDC fee to collector directly from vault owner
        usdcToken.safeTransferFrom(vaultOwner, address(this), fee);

        // Invariant INV-4: Exact 50/50 split with zero rounding loss
        uint256 buybackShare = fee / 2;
        uint256 yieldShare = fee - buybackShare;

        buybackBudget += buybackShare;
        yieldBudget += yieldShare;
        totalFeesCaptured += fee;

        emit FeeProcessed(vaultOwner, savedPenaltyAmount, fee, buybackShare, yieldShare);
    }

    /**
     * @notice Processes a deferred fee debt payment and splits it 50/50.
     * @dev Enforces Invariant INV-4: exact 50/50 division with zero rounding leakage.
     * @param payer The account transferring the USDC.
     * @param vaultOwner The vault borrower whose deferred fee debt is being settled.
     * @param feeAmount The fee amount in USDC (scaled 1e6).
     */
    function processFeeDebtPayment(
        address payer,
        address vaultOwner,
        uint256 feeAmount
    ) external override onlyVaultOrOwner nonReentrant {
        if (feeAmount == 0) revert ZeroAmount();
        if (payer == address(0) || vaultOwner == address(0)) revert ZeroAddress();

        // Transfer USDC fee to collector directly from payer
        usdcToken.safeTransferFrom(payer, address(this), feeAmount);

        // Invariant INV-4: Exact 50/50 split with zero rounding loss
        uint256 buybackShare = feeAmount / 2;
        uint256 yieldShare = feeAmount - buybackShare;

        buybackBudget += buybackShare;
        yieldBudget += yieldShare;
        totalFeesCaptured += feeAmount;

        emit FeeDebtPaymentProcessed(payer, vaultOwner, feeAmount, buybackShare, yieldShare);
    }

    /**
     * @notice Swaps the accumulated buyback budget for $AEGIS on Ascend and burns it permanently.
     */
    function executeBuybackAndBurn() external override {
        uint256 minOut = 0;
        if (minBuybackRate > 0) {
            minOut = (buybackBudget * minBuybackRate) / 1e6;
        }
        executeBuybackAndBurn(minOut);
    }

    /**
     * @notice Swaps the accumulated buyback budget for $AEGIS with minimum output slippage protection.
     * @param minAegisOut Minimum $AEGIS tokens to receive from the swap.
     */
    function executeBuybackAndBurn(uint256 minAegisOut) public override nonReentrant {
        uint256 budget = buybackBudget;
        if (budget == 0) revert InsufficientBudget();

        if (minBuybackRate > 0) {
            uint256 requiredMinOut = (budget * minBuybackRate) / 1e6;
            if (minAegisOut < requiredMinOut) {
                minAegisOut = requiredMinOut;
            }
        }

        buybackBudget = 0;
        totalBurnedFees += budget;

        usdcToken.forceApprove(address(ascendHookPool), budget);
        uint256 aegisReceived = ascendHookPool.swap(
            address(usdcToken),
            address(aegisToken),
            budget,
            minAegisOut,
            address(this)
        );

        if (aegisReceived > 0) {
            aegisToken.safeTransfer(DEAD_ADDRESS, aegisReceived);
            totalAegisBurned += aegisReceived;
        }

        emit BuybackAndBurnExecuted(budget, aegisReceived);
    }

    /**
     * @notice Distributes accumulated yield budget in USDC to the designated staker pool.
     */
    function distributeYield() public override nonReentrant {
        uint256 amount = yieldBudget;
        if (amount == 0) revert InsufficientBudget();

        yieldBudget = 0;
        totalDistributedYield += amount;

        usdcToken.safeTransfer(yieldDistributionTarget, amount);

        emit YieldDistributed(yieldDistributionTarget, amount);
    }

    /**
     * @notice Public alias to trigger yield distribution.
     */
    function claimYield() external override {
        distributeYield();
    }
}
