// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
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
    ZeroAddress
} from "./AegisTypes.sol";
import {IAegisVault} from "./interfaces/IAegisVault.sol";
import {IAegisFeeCollector} from "./interfaces/IAegisFeeCollector.sol";
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

    /// @notice Vault positions mapped by borrower address
    mapping(address => VaultPosition) public positions;

    /// @notice Pro-trader configurations mapped by borrower address
    mapping(address => ProConfig) public configs;

    /// @notice Active hedge positions mapped by borrower address
    mapping(address => ActiveHedge) public activeHedges;

    /// @notice Optional fee collector contract
    address public feeCollector;

    constructor(address initialOwner) Ownable(initialOwner) TradeIntentExecutor() {}

    /**
     * @notice Set the protocol fee collector contract address.
     */
    function setFeeCollector(address _feeCollector) external onlyOwner {
        if (_feeCollector == address(0)) revert ZeroAddress();
        feeCollector = _feeCollector;
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
        if (ltvBps == 0 || ltvBps > 10000) revert InvalidHealthTrigger();

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
        markPrice = HyperCoreOracleAdapter.getPerpPrice(perpIndex);
        VaultPosition storage pos = positions[vaultOwner];
        ProConfig storage cfg = configs[vaultOwner];

        if (pos.debtAmountUsdc == 0) {
            return (type(uint256).max, false, markPrice);
        }

        // H = (Q_collateral * P_mark * T) / (D_total * 1e20)
        healthFactor = (uint256(pos.collateralAmount) * markPrice * uint256(pos.liquidationThresholdBps))
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

        // Telemetry verification: verify health factor breached trigger
        (, bool isTriggered, uint256 markPrice) = getVaultHealth(vaultOwner, perpIndex);
        if (!isTriggered) revert InvalidHealthTrigger();

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
        uint256 absSize = size < 0 ? uint256(-size) : uint256(size);
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
     * @notice Unwinds an active hedge upon market rebound and processes protocol performance fees.
     * @param vaultOwner Address of the vault owner.
     * @param perpIndex HyperCore perpetual market index.
     * @param exitPrice Execution exit price.
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

        if (!hedge.isOpen) revert InvalidHealthTrigger();

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
        if (feeCollector != address(0)) {
            // Averted liquidation penalty = 5% of collateral valuation
            uint256 colValUsdc = (uint256(pos.collateralAmount) * exitPrice) / 1e20;
            uint256 savedPenalty = (colValUsdc * 500) / 10000;
            if (savedPenalty > 0) {
                try IAegisFeeCollector(feeCollector).processAvertedFee(vaultOwner, savedPenalty) {}
                catch {}
            }
        }

        emit HedgeUnwound(vaultOwner, perpIndex, exitPrice);
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
