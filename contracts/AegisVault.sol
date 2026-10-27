// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {
    TriggerMode,
    OrderType,
    VaultState,
    ProConfig,
    VaultPosition,
    ActiveHedge,
    InvalidHealthTrigger,
    SlippageExceeded,
    SessionKeyExpired,
    OverrideActive,
    ZeroAddress,
    HedgeAlreadyActive,
    TrailingExitNotReached,
    InvalidPrice,
    MismatchedMarketIndex,
    NoOutstandingDebt,
    ZeroRepaymentAmount,
    AmountOverflow,
    InvalidHedgeDirection,
    HedgeSizeExceeded,
    InvalidAmount,
    NoActiveHedge,
    PredeployWriteFailed
} from "./AegisTypes.sol";
import {IAegisVault} from "./interfaces/IAegisVault.sol";
import {IAegisFeeCollector} from "./interfaces/IAegisFeeCollector.sol";
import {IHyperCoreOracle} from "./interfaces/IHyperCoreOracle.sol";
import {IHyperCoreWriter} from "./interfaces/IHyperCoreWriter.sol";
import {TradeIntentExecutor} from "./core/TradeIntentExecutor.sol";
import {HyperCoreOracleAdapter} from "./adapters/HyperCoreOracleAdapter.sol";

/**
 * @title AegisVault
 * @notice Primary risk engine and non-custodial vault lifecycle manager for AEGIS Protocol.
 * @dev Enforces Invariant INV-1 (non-custodial session keys), Invariant INV-3 (instant manualOverride),
 *      and Invariant INV-5 (strictly monotonic nonce progression).
 */
contract AegisVault is IAegisVault, TradeIntentExecutor, ReentrancyGuard, Ownable {
    using HyperCoreOracleAdapter for uint32;

    /// @notice Protocol fee in basis points (10% = 1000 bps)
    uint256 public constant PROTOCOL_FEE_BPS = 1000;

    /// @notice Vault positions mapped by borrower address
    mapping(address => VaultPosition) public positions;

    /// @notice Pro-trader configurations mapped by borrower address
    mapping(address => ProConfig) public configs;

    /// @notice Active hedge positions mapped by borrower address
    mapping(address => ActiveHedge) public activeHedges;

    /// @notice Deferred fee debt mapped by borrower address (USDC scaled 1e6)
    mapping(address => uint256) public feeDebts;

    /// @notice Optional fee collector contract
    address public feeCollector;

    /// @notice Modular price oracle feed adapter
    IHyperCoreOracle public oracleAdapter;

    constructor(address initialOwner) Ownable(initialOwner) TradeIntentExecutor() {}

    /**
     * @notice Set the protocol fee collector contract address.
     */
    function setFeeCollector(address _feeCollector) external onlyOwner {
        if (_feeCollector == address(0)) revert ZeroAddress();
        feeCollector = _feeCollector;
    }

    /**
     * @notice Set the price oracle feed adapter.
     */
    function setOracleAdapter(address _oracle) external override onlyOwner {
        if (_oracle == address(0)) revert ZeroAddress();
        address oldOracle = address(oracleAdapter);
        oracleAdapter = IHyperCoreOracle(_oracle);
        emit OracleAdapterUpdated(oldOracle, _oracle);
    }

    /**
     * @notice Set the trade intent writer adapter.
     */
    function setHyperCoreWriter(address _writer) external override onlyOwner {
        address oldWriter = hyperCoreWriter;
        _setHyperCoreWriter(_writer);
        emit HyperCoreWriterUpdated(oldWriter, _writer);
    }

    /**
     * @dev Internal price resolver querying modular oracleAdapter or fallback 0x0801 precompile.
     */
    function _getPerpPrice(uint32 perpIndex) internal view returns (uint256) {
        if (address(oracleAdapter) != address(0)) {
            return oracleAdapter.getPerpPrice(perpIndex);
        }
        return HyperCoreOracleAdapter.getPerpPrice(perpIndex);
    }

    /**
     * @notice Register a borrower position to be monitored and hedged by AEGIS.
     * @dev Non-custodial: user registers their collateral state parameters.
     * @param collateralToken Address of collateral asset.
     * @param amount Collateral balance scaled 1e18.
     * @param debtUsdc Outstanding borrowed debt liability scaled 1e6.
     * @param ltvBps Maintenance liquidation threshold (e.g. 8000 = 80%).
     */
    function registerPosition(
        address collateralToken,
        uint256 amount,
        uint256 debtUsdc,
        uint16 ltvBps
    ) external override nonReentrant {
        if (collateralToken == address(0)) revert ZeroAddress();
        if (amount == 0 || debtUsdc == 0) revert InvalidAmount();
        if (ltvBps == 0 || ltvBps > 10000) revert InvalidHealthTrigger();
        if (amount > type(uint96).max) revert AmountOverflow();

        positions[msg.sender] = VaultPosition({
            owner: msg.sender,
            liquidationThresholdBps: ltvBps,
            lastHedgeBlock: 0,
            collateralToken: collateralToken,
            collateralAmount: uint96(amount),
            debtAmountUsdc: debtUsdc,
            sessionKey: positions[msg.sender].sessionKey
        });

        emit PositionRegistered(msg.sender, collateralToken, amount, debtUsdc, ltvBps);
    }

    /**
     * @notice Configures pro-trader risk and execution thresholds.
     * @param config Trader configuration parameters.
     */
    function setProConfig(ProConfig calldata config) external override nonReentrant {
        // Enforce parameter boundaries
        if (config.hedgeRatioBps < 1000 || config.hedgeRatioBps > 10000) {
            revert InvalidHealthTrigger();
        }
        if (config.healthFactorTrigger < 10200 || config.healthFactorTrigger > 13000) {
            revert InvalidHealthTrigger();
        }
        if (config.maxSlippageBps < 10 || config.maxSlippageBps > 100) {
            revert SlippageExceeded();
        }

        ProConfig storage current = configs[msg.sender];
        current.triggerMode = config.triggerMode;
        current.orderType = config.orderType;
        current.hedgeRatioBps = config.hedgeRatioBps;
        current.trailingTakeProfitBps = config.trailingTakeProfitBps;
        current.maxSlippageBps = config.maxSlippageBps;
        current.priceTrigger = config.priceTrigger;
        current.healthFactorTrigger = config.healthFactorTrigger;

        emit ProConfigUpdated(msg.sender, current);
    }

    /**
     * @notice Delegates a trade-only session key to execute autonomous hedge intents.
     * @param key Address of the authorized session key.
     * @param duration Validity duration in seconds.
     */
    function delegateSessionKey(address key, uint48 duration) external override nonReentrant {
        if (key == address(0)) revert ZeroAddress();

        uint48 expiry = uint48(block.timestamp) + duration;
        positions[msg.sender].sessionKey = key;
        configs[msg.sender].sessionKeyExpiry = expiry;
        configs[msg.sender].manualOverrideActive = false;

        emit SessionKeyDelegated(msg.sender, key, expiry);
    }

    /**
     * @notice Revokes the delegated session key.
     */
    function revokeSessionKey() external override nonReentrant {
        positions[msg.sender].sessionKey = address(0);
        configs[msg.sender].sessionKeyExpiry = 0;
        emit SessionKeyRevoked(msg.sender);
    }

    /**
     * @notice Emergency manual override killswitch (Invariant INV-3).
     * @dev Atomically disables all keeper automation and revokes the session key in a single transaction.
     */
    function manualOverride() external override nonReentrant {
        configs[msg.sender].manualOverrideActive = true;
        positions[msg.sender].sessionKey = address(0);
        configs[msg.sender].sessionKeyExpiry = 0;

        emit ManualOverrideActivated(msg.sender);
    }

    /**
     * @notice Normalizes collateral token amount to 18 decimals for accurate health calculations.
     * @param token Address of the collateral token.
     * @param rawAmount Unscaled collateral amount.
     * @return Normalized collateral amount scaled to 18 decimals.
     */
    function _getNormalizedCollateral(address token, uint256 rawAmount) internal view returns (uint256) {
        if (token == address(0) || rawAmount == 0) return rawAmount;
        try IERC20Metadata(token).decimals() returns (uint8 dec) {
            if (dec < 18) {
                return rawAmount * (10 ** (18 - dec));
            } else if (dec > 18 && dec <= 36) {
                return rawAmount / (10 ** (dec - 18));
            }
            return rawAmount;
        } catch {
            return rawAmount;
        }
    }

    /**
     * @notice Calculates the current health factor and trigger status of a borrower vault.
     * @param vaultOwner Address of the vault owner.
     * @param perpIndex Market index to query for mark price.
     * @return healthFactor Health factor scaled 1e4 (10000 = 1.00).
     * @return isTriggered True if trigger threshold breached.
     * @return markPrice Current perpetual mark price from 0x0801 precompile.
     */
    function getVaultHealth(address vaultOwner, uint32 perpIndex)
        public
        view
        override
        returns (uint256 healthFactor, bool isTriggered, uint256 markPrice)
    {
        markPrice = _getPerpPrice(perpIndex);
        VaultPosition storage pos = positions[vaultOwner];
        ProConfig storage cfg = configs[vaultOwner];

        if (pos.debtAmountUsdc == 0) {
            return (type(uint256).max, false, markPrice);
        }

        uint256 normalizedCollateral = _getNormalizedCollateral(pos.collateralToken, uint256(pos.collateralAmount));

        // H = (Q_collateral * P_mark * T) / (D_total * 1e20)
        healthFactor = (normalizedCollateral * markPrice * uint256(pos.liquidationThresholdBps))
            / (pos.debtAmountUsdc * 1e20);

        if (cfg.triggerMode == uint8(TriggerMode.PRICE)) {
            isTriggered = (markPrice <= cfg.priceTrigger);
        } else if (cfg.triggerMode == uint8(TriggerMode.HEALTH_FACTOR)) {
            isTriggered = (healthFactor <= cfg.healthFactorTrigger);
        } else {
            // HYBRID: Breached if health factor <= trigger OR price <= priceTrigger
            isTriggered = (healthFactor <= cfg.healthFactorTrigger)
                || (cfg.priceTrigger > 0 && markPrice <= cfg.priceTrigger);
        }

        return (healthFactor, isTriggered, markPrice);
    }

    /**
     * @notice Executes an autonomous short hedge intent on HyperCore via 0x0802 predeploy.
     * @param vaultOwner Address of the vault owner being protected.
     * @param perpIndex HyperCore perpetual market index.
     * @param size Position size (negative for short).
     * @param limitPrice Execution limit price.
     * @param deadline Signature expiry timestamp.
     * @param signature EIP-712 signature generated by the authorized session key.
     */
    function executeHedgeIntent(
        address vaultOwner,
        uint32 perpIndex,
        int256 size,
        uint256 limitPrice,
        uint256 deadline,
        bytes calldata signature
    ) external override nonReentrant {
        ProConfig storage cfg = configs[vaultOwner];
        VaultPosition storage pos = positions[vaultOwner];

        // Invariant INV-3: Killswitch blocks all keeper executions
        if (cfg.manualOverrideActive) revert OverrideActive();
        if (block.timestamp > cfg.sessionKeyExpiry) revert SessionKeyExpired();

        // Security Guard: Prevent double-hedge overwrites while an active hedge is open
        if (activeHedges[vaultOwner].isOpen) revert HedgeAlreadyActive();

        // Direction Guard: Hedge position must be short (negative size)
        if (size >= 0) revert InvalidHedgeDirection();

        // Telemetry verification: verify health factor breached trigger
        (, bool isTriggered, uint256 markPrice) = getVaultHealth(vaultOwner, perpIndex);
        if (!isTriggered) revert InvalidHealthTrigger();

        // Slippage Guard: Limit price cannot violate configured max slippage against mark price
        uint256 minLimitPrice = (markPrice * (10000 - uint256(cfg.maxSlippageBps))) / 10000;
        if (limitPrice < minLimitPrice) revert SlippageExceeded();

        // Size Bounds Guard: Hedge size cannot exceed configured hedge ratio of normalized collateral
        uint256 absSize = uint256(-size);
        uint256 normalizedCollateral = _getNormalizedCollateral(pos.collateralToken, uint256(pos.collateralAmount));
        uint256 maxAllowedSize = (normalizedCollateral * uint256(cfg.hedgeRatioBps) * 105) / (10000 * 100);
        if (absSize > maxAllowedSize) revert HedgeSizeExceeded();

        // Verify cryptographic session key intent & dispatch order
        _verifyAndDispatch(
            vaultOwner,
            pos.sessionKey,
            perpIndex,
            size,
            limitPrice,
            deadline,
            signature
        );

        // Record active hedge tracking state
        uint256 exitTrigger = (markPrice * (10000 + cfg.trailingTakeProfitBps)) / 10000;

        activeHedges[vaultOwner] = ActiveHedge({
            isOpen: true,
            perpMarketIndex: perpIndex,
            size: absSize,
            entryPrice: markPrice,
            lowestWickPrice: markPrice,
            trailingExitPrice: exitTrigger
        });

        pos.lastHedgeBlock = uint48(block.number);

        emit HedgeExecuted(vaultOwner, perpIndex, size, markPrice);
    }

    /**
     * @notice Updates the lowest observed wick price for an active hedge, ratcheting down trailingExitPrice.
     * @param vaultOwner Address of the hedged vault owner.
     */
    function updateLowestWick(address vaultOwner) public override {
        ActiveHedge storage hedge = activeHedges[vaultOwner];
        if (!hedge.isOpen) return;

        uint256 liveMarkPrice = _getPerpPrice(hedge.perpMarketIndex);
        if (liveMarkPrice > 0 && liveMarkPrice < hedge.lowestWickPrice) {
            ProConfig storage cfg = configs[vaultOwner];
            hedge.lowestWickPrice = liveMarkPrice;
            hedge.trailingExitPrice = (liveMarkPrice * (10000 + cfg.trailingTakeProfitBps)) / 10000;
            emit LowestWickUpdated(vaultOwner, liveMarkPrice, hedge.trailingExitPrice);
        }
    }

    /**
     * @notice Unwinds an active hedge upon market rebound and processes protocol performance fees.
     * @dev Validates trusted oracle price, enforces trailing exit target, and guards against caller fee inflation.
     * @param vaultOwner Address of the vault owner.
     * @param perpIndex HyperCore perpetual market index.
     * @param exitPrice Execution exit limit price.
     * @param deadline Signature expiry timestamp.
     * @param signature EIP-712 signature from the authorized session key.
     */
    function executeUnwindIntent(
        address vaultOwner,
        uint32 perpIndex,
        uint256 exitPrice,
        uint256 deadline,
        bytes calldata signature
    ) external override nonReentrant {
        ActiveHedge storage hedge = activeHedges[vaultOwner];
        VaultPosition storage pos = positions[vaultOwner];
        ProConfig storage cfg = configs[vaultOwner];

        if (cfg.manualOverrideActive) revert OverrideActive();
        if (block.timestamp > cfg.sessionKeyExpiry) revert SessionKeyExpired();

        if (!hedge.isOpen) revert InvalidHealthTrigger();
        if (perpIndex != hedge.perpMarketIndex) revert MismatchedMarketIndex();
        if (exitPrice == 0) revert InvalidPrice();

        // Query trusted live oracle price
        uint256 liveMarkPrice = _getPerpPrice(perpIndex);
        if (liveMarkPrice == 0) revert InvalidPrice();

        // Ratchet lowest wick if price dipped lower before rebounding
        if (liveMarkPrice < hedge.lowestWickPrice) {
            hedge.lowestWickPrice = liveMarkPrice;
            hedge.trailingExitPrice = (liveMarkPrice * (10000 + cfg.trailingTakeProfitBps)) / 10000;
            emit LowestWickUpdated(vaultOwner, liveMarkPrice, hedge.trailingExitPrice);
        }

        // Validate trailing take-profit target has been reached on market rebound
        if (liveMarkPrice < hedge.trailingExitPrice) {
            revert TrailingExitNotReached(liveMarkPrice, hedge.trailingExitPrice);
        }

        // Validate exitPrice (buy-to-close limit price) does not exceed max slippage from live mark price
        uint256 maxAllowedExitPrice = (liveMarkPrice * (10000 + cfg.maxSlippageBps)) / 10000;
        if (exitPrice > maxAllowedExitPrice) revert SlippageExceeded();

        // Dispatch buy-to-close intent
        _verifyAndDispatch(
            vaultOwner,
            pos.sessionKey,
            perpIndex,
            int256(hedge.size),
            exitPrice,
            deadline,
            signature
        );

        hedge.isOpen = false;

        // Process averted liquidation penalty fee if FeeCollector is set
        // Anchored to live oracle mark price, completely eliminating caller-controlled fee manipulation
        if (feeCollector != address(0)) {
            // Averted liquidation penalty = 5% of collateral valuation
            uint256 valuationPrice = liveMarkPrice < exitPrice ? liveMarkPrice : exitPrice;
            uint256 normCollateral = _getNormalizedCollateral(pos.collateralToken, pos.collateralAmount);
            uint256 colValUsdc = (normCollateral * valuationPrice) / 1e20;
            uint256 savedPenalty = (colValUsdc * 500) / 10000;
            if (savedPenalty > 0) {
                try IAegisFeeCollector(feeCollector).processAvertedFee(vaultOwner, savedPenalty) {}
                catch (bytes memory reason) {
                    emit FeeCollectionFailed(vaultOwner, savedPenalty, reason);
                    uint256 protocolFee = (savedPenalty * PROTOCOL_FEE_BPS) / 10000;
                    if (protocolFee > 0) {
                        feeDebts[vaultOwner] += protocolFee;
                        emit FeeDebtAccrued(vaultOwner, protocolFee, feeDebts[vaultOwner]);
                    }
                }
            }
        }

        emit HedgeUnwound(vaultOwner, perpIndex, exitPrice);
    }

    /**
     * @notice Emergency/manual unwind of an active hedge by the vault owner directly.
     * @dev Allows the owner to close their active hedge even if manualOverride is active or session key revoked.
     *      Dispatches directly to HyperCoreWriter without requiring delegated session key signature.
     * @param perpIndex HyperCore perpetual market index.
     * @param exitPrice Execution exit limit price.
     */
    function manualUnwind(uint32 perpIndex, uint256 exitPrice) external override nonReentrant {
        address vaultOwner = msg.sender;
        ActiveHedge storage hedge = activeHedges[vaultOwner];
        VaultPosition storage pos = positions[vaultOwner];
        ProConfig storage cfg = configs[vaultOwner];

        if (!hedge.isOpen) revert NoActiveHedge();
        if (perpIndex != hedge.perpMarketIndex) revert MismatchedMarketIndex();
        if (exitPrice == 0) revert InvalidPrice();

        uint256 liveMarkPrice = _getPerpPrice(perpIndex);
        if (liveMarkPrice == 0) revert InvalidPrice();

        // Validate exitPrice does not exceed max slippage from live mark price
        uint256 maxAllowedExitPrice = (liveMarkPrice * (10000 + cfg.maxSlippageBps)) / 10000;
        if (exitPrice > maxAllowedExitPrice) revert SlippageExceeded();

        // Monotonic nonce progression (INV-5)
        uint256 currentNonce = vaultNonces[vaultOwner]++;

        // Dispatch buy-to-close intent directly to HyperCore writer
        bool writeSuccess = IHyperCoreWriter(hyperCoreWriter).placeHedgeIntent(
            vaultOwner,
            perpIndex,
            int256(hedge.size),
            exitPrice
        );
        if (!writeSuccess) revert PredeployWriteFailed();

        emit HedgeIntentDispatched(vaultOwner, perpIndex, int256(hedge.size), exitPrice, currentNonce);

        hedge.isOpen = false;

        // Process fee collection / fee debt if applicable
        if (feeCollector != address(0)) {
            uint256 valuationPrice = liveMarkPrice < exitPrice ? liveMarkPrice : exitPrice;
            uint256 normCollateral = _getNormalizedCollateral(pos.collateralToken, pos.collateralAmount);
            uint256 colValUsdc = (normCollateral * valuationPrice) / 1e20;
            uint256 savedPenalty = (colValUsdc * 500) / 10000;
            if (savedPenalty > 0) {
                try IAegisFeeCollector(feeCollector).processAvertedFee(vaultOwner, savedPenalty) {}
                catch (bytes memory reason) {
                    emit FeeCollectionFailed(vaultOwner, savedPenalty, reason);
                    uint256 protocolFee = (savedPenalty * PROTOCOL_FEE_BPS) / 10000;
                    if (protocolFee > 0) {
                        feeDebts[vaultOwner] += protocolFee;
                        emit FeeDebtAccrued(vaultOwner, protocolFee, feeDebts[vaultOwner]);
                    }
                }
            }
        }

        emit HedgeUnwound(vaultOwner, perpIndex, exitPrice);
    }

    /**
     * @notice Repays outstanding fee debt for the caller.
     * @param amount The maximum amount of USDC to repay.
     * @return repaid The actual amount of USDC repaid and deducted from fee debt.
     */
    function repayFeeDebt(uint256 amount) external override returns (uint256 repaid) {
        return _repayFeeDebt(msg.sender, msg.sender, amount);
    }

    /**
     * @notice Repays outstanding fee debt for a specific borrower (third-party repayment).
     * @param borrower The borrower whose fee debt is being repaid.
     * @param amount The maximum amount of USDC to repay.
     * @return repaid The actual amount of USDC repaid and deducted from fee debt.
     */
    function repayFeeDebtFor(address borrower, uint256 amount) external override returns (uint256 repaid) {
        return _repayFeeDebt(msg.sender, borrower, amount);
    }

    /**
     * @notice Internal handler for fee debt repayment.
     * @param payer The address providing the USDC funds.
     * @param borrower The borrower whose debt is being reduced.
     * @param amount The maximum amount requested for repayment.
     * @return repaid The actual amount repaid.
     */
    function _repayFeeDebt(
        address payer,
        address borrower,
        uint256 amount
    ) internal nonReentrant returns (uint256 repaid) {
        if (amount == 0) revert ZeroRepaymentAmount();
        if (borrower == address(0)) revert ZeroAddress();

        uint256 currentDebt = feeDebts[borrower];
        if (currentDebt == 0) revert NoOutstandingDebt();

        if (feeCollector == address(0)) revert ZeroAddress();

        repaid = amount > currentDebt ? currentDebt : amount;

        // Collect payment via fee collector
        IAegisFeeCollector(feeCollector).processFeeDebtPayment(payer, borrower, repaid);

        // Update accounting after external call succeeds
        uint256 remainingDebt = currentDebt - repaid;
        feeDebts[borrower] = remainingDebt;

        emit FeeDebtRepaid(borrower, payer, repaid, remainingDebt);
    }

    /**
     * @notice Returns the outstanding fee debt in USDC (scaled 1e6) for a given borrower.
     */
    function getFeeDebt(address borrower) external view override returns (uint256) {
        return feeDebts[borrower];
    }

    // View Getters
    function getPosition(address vaultOwner) external view override returns (VaultPosition memory) {
        return positions[vaultOwner];
    }

    function getProConfig(address vaultOwner) external view override returns (ProConfig memory) {
        return configs[vaultOwner];
    }

    function getActiveHedge(address vaultOwner) external view override returns (ActiveHedge memory) {
        return activeHedges[vaultOwner];
    }
}
