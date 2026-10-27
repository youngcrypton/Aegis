export enum TriggerMode {
  PRICE = 0,
  HEALTH_FACTOR = 1,
  HYBRID = 2
}

export enum OrderType {
  POST_ONLY_LIMIT = 0,
  IOC = 1,
  MARKET = 2
}

export enum VaultState {
  STANDBY = 0,
  ARMED = 1,
  HEDGED = 2,
  UNWOUND = 3,
  OVERRIDDEN = 4
}

export interface ProConfigData {
  triggerMode: number;
  orderType: number;
  hedgeRatioBps: number; // 1000 to 10000
  trailingTakeProfitBps: number; // 50 to 500
  maxSlippageBps: number; // 10 to 100
  sessionKeyExpiry: number;
  manualOverrideActive: boolean;
  priceTrigger: bigint; // scaled 1e8
  healthFactorTrigger: bigint; // scaled 1e4 (e.g. 11000 = 1.10)
}

export interface VaultPositionData {
  vaultAddress: string;
  owner: string;
  liquidationThresholdBps: number; // e.g. 8000 = 80%
  lastHedgeBlock: number;
  collateralToken: string;
  collateralDecimals?: number; // token decimals (defaults to 18)
  collateralAmount: bigint; // unscaled raw amount
  debtAmountUsdc: bigint; // scaled 1e6
  sessionKey: string;
  config: ProConfigData;
}

export interface RiskEvaluationResult {
  healthFactor: bigint; // scaled 1e4
  isTriggerBreached: boolean;
  recommendedHedgeSize: bigint; // scaled 1e18
  vaultState: VaultState;
  reason: string;
}

export class RiskEngine {
  /**
   * Normalizes raw collateral amount to standard 18-decimal precision.
   */
  public normalizeCollateralAmount(collateralAmount: bigint, decimals: number = 18): bigint {
    if (decimals === 18) return collateralAmount;
    if (decimals < 18) {
      return collateralAmount * (10n ** BigInt(18 - decimals));
    }
    return collateralAmount / (10n ** BigInt(decimals - 18));
  }

  /**
   * Computes Health Factor H scaled 1e4 (10000 = 1.00)
   * Formula: H = (Q_collateral_normalized * P_mark * T_bps) / (D_debt * 10^20)
   */
  public computeHealthFactor(
    collateralAmount: bigint,
    markPrice: bigint,
    liquidationThresholdBps: number,
    debtAmountUsdc: bigint,
    collateralDecimals: number = 18
  ): bigint {
    if (debtAmountUsdc === 0n) {
      return 100_0000n; // Arbitrary high value if debt is 0 (100.00)
    }

    const normalizedCollateral = this.normalizeCollateralAmount(collateralAmount, collateralDecimals);

    // normalizedCollateral: 1e18
    // markPrice: 1e8
    // liquidationThresholdBps: e.g. 8000
    // debtAmountUsdc: 1e6
    // Formula scales denominator by 1e20 to produce 1e4 scale:
    // (1e18 * 1e8 * 1e4) / (1e6 * 1e20) = 1e30 / 1e26 = 1e4
    const numerator = normalizedCollateral * markPrice * BigInt(liquidationThresholdBps);
    const denominator = debtAmountUsdc * 100_000_000_000_000_000_000n; // 1e20

    return numerator / denominator;
  }

  /**
   * Checks whether the vault's risk trigger has breached user-configured parameters.
   */
  public isTriggerBreached(
    healthFactor: bigint,
    markPrice: bigint,
    config: ProConfigData
  ): boolean {
    if (config.manualOverrideActive) {
      return false; // Invariant INV-3: Overridden positions must never be hedged by keeper
    }

    if (config.triggerMode === TriggerMode.PRICE) {
      return markPrice <= config.priceTrigger;
    } else if (config.triggerMode === TriggerMode.HEALTH_FACTOR) {
      return healthFactor <= config.healthFactorTrigger;
    } else {
      // HYBRID: either condition triggers protection
      return healthFactor <= config.healthFactorTrigger || markPrice <= config.priceTrigger;
    }
  }

  /**
   * Computes optimal hedge size Q_hedge according to Section 6.2 of PROMPT.md
   * Full delta-neutral (gamma = 1.00 / 10000 bps): Q_hedge = Q_collateral
   * Partial hedging (gamma < 1.00): Q_hedge = gamma * (D_total - Q_collateral * P * T) / (P_perp * (1 - T))
   */
  public computeHedgeSize(
    collateralAmount: bigint,
    markPrice: bigint,
    liquidationThresholdBps: number,
    debtAmountUsdc: bigint,
    hedgeRatioBps: number,
    collateralDecimals: number = 18
  ): bigint {
    const normalizedCollateral = this.normalizeCollateralAmount(collateralAmount, collateralDecimals);
    if (hedgeRatioBps >= 10000) {
      return normalizedCollateral;
    }

    const tBps = BigInt(liquidationThresholdBps);
    // Collateral threshold valuation in 1e6 USDC units:
    // Q(1e18) * P(1e8) * T(1e4) / 1e24 = 1e6
    const collateralThresholdValuation =
      (normalizedCollateral * markPrice * tBps) / 1_000_000_000_000_000_000_000_000n;

    if (debtAmountUsdc <= collateralThresholdValuation) {
      // Minimal protection if debt is below threshold
      return (normalizedCollateral * BigInt(hedgeRatioBps)) / 10000n;
    }

    const deficitUsdc = debtAmountUsdc - collateralThresholdValuation;
    const oneMinusT = 10000n - tBps;

    // Deficit in base asset:
    // (deficitUsdc * 1e20) / (markPrice * oneMinusT)
    const baseDeficit = (deficitUsdc * 100_000_000_000_000_000_000n) / (markPrice * oneMinusT);
    const hedgeSize = (baseDeficit * BigInt(hedgeRatioBps)) / 10000n;

    return hedgeSize > normalizedCollateral ? normalizedCollateral : hedgeSize;
  }

  /**
   * Evaluates complete risk profile for a vault position against current mark price.
   */
  public evaluatePosition(
    position: VaultPositionData,
    markPrice: bigint
  ): RiskEvaluationResult {
    if (position.config.manualOverrideActive) {
      return {
        healthFactor: 0n,
        isTriggerBreached: false,
        recommendedHedgeSize: 0n,
        vaultState: VaultState.OVERRIDDEN,
        reason: "Manual override active (INV-3 enforced)"
      };
    }

    const decimals = position.collateralDecimals ?? 18;
    const h = this.computeHealthFactor(
      position.collateralAmount,
      markPrice,
      position.liquidationThresholdBps,
      position.debtAmountUsdc,
      decimals
    );

    const breached = this.isTriggerBreached(h, markPrice, position.config);

    if (breached) {
      const hedgeSize = this.computeHedgeSize(
        position.collateralAmount,
        markPrice,
        position.liquidationThresholdBps,
        position.debtAmountUsdc,
        position.config.hedgeRatioBps,
        decimals
      );

      return {
        healthFactor: h,
        isTriggerBreached: true,
        recommendedHedgeSize: hedgeSize,
        vaultState: VaultState.ARMED,
        reason: `Trigger breached: H=${Number(h) / 10000} vs Trigger=${
          Number(position.config.healthFactorTrigger) / 10000
        }`
      };
    }

    return {
      healthFactor: h,
      isTriggerBreached: false,
      recommendedHedgeSize: 0n,
      vaultState: VaultState.STANDBY,
      reason: `Position healthy: H=${Number(h) / 10000}`
    };
  }
}
