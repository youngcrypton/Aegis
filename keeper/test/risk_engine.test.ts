import { ethers } from "ethers";
import {
  RiskEngine,
  TriggerMode,
  OrderType,
  VaultPositionData,
  ProConfigData,
  VaultState
} from "../src/risk_engine";

describe("RiskEngine Mathematical & Invariant Properties", () => {
  let riskEngine: RiskEngine;

  beforeEach(() => {
    riskEngine = new RiskEngine();
  });

  const baseConfig: ProConfigData = {
    triggerMode: TriggerMode.HYBRID,
    orderType: OrderType.POST_ONLY_LIMIT,
    hedgeRatioBps: 5000, // 50% hedge ratio
    trailingTakeProfitBps: 150, // 1.5%
    maxSlippageBps: 50, // 0.5%
    sessionKeyExpiry: 1893456000,
    manualOverrideActive: false,
    priceTrigger: 44_20000000n, // $44.20
    healthFactorTrigger: 11000n // 1.10 scaled 1e4
  };

  const basePosition: VaultPositionData = {
    vaultAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    owner: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    liquidationThresholdBps: 8000, // 80%
    lastHedgeBlock: 100,
    collateralToken: "0xcA03Dc4665A8C3603cb4Fd5Ce71Af9649dC00d44",
    collateralAmount: ethers.parseUnits("1000", 18), // 1000 HYPE
    debtAmountUsdc: 32_000_000000n, // $32,000 USDC
    sessionKey: "0x71C85a3F9a489f31B54aA89e62Ce378901B2A89F",
    config: baseConfig
  };

  it("should accurately compute health factor matching Solidity formula", () => {
    // P = $48.50 (48_50000000n)
    // H = (1000e18 * 48.5e8 * 8000) / (32000e6 * 1e20)
    // Numerator: 1000 * 4850000000 * 8000 = 38,800,000,000,000 * 1e18
    // Denominator: 32000 * 1e20 = 32000 * 1e20 = 3,200,000 * 1e20
    // Result: 12125 = 1.2125
    const markPrice = 48_50000000n;
    const hf = riskEngine.computeHealthFactor(
      basePosition.collateralAmount,
      markPrice,
      basePosition.liquidationThresholdBps,
      basePosition.debtAmountUsdc
    );

    expect(hf).toBe(12125n); // 1.2125
  });

  it("should return arbitrary high health factor when debt is 0", () => {
    const hf = riskEngine.computeHealthFactor(
      basePosition.collateralAmount,
      48_50000000n,
      8000,
      0n
    );
    expect(hf).toBe(100_0000n);
  });

  it("should strictly respect Invariant INV-3: manual override disables trigger breach", () => {
    const overriddenConfig: ProConfigData = {
      ...baseConfig,
      manualOverrideActive: true
    };

    // Health factor below trigger threshold
    const lowHf = 10500n; // 1.05 < 1.10
    const lowPrice = 40_0000000n; // $40.00 < $44.20

    const isBreached = riskEngine.isTriggerBreached(lowHf, lowPrice, overriddenConfig);
    expect(isBreached).toBe(false);
  });

  it("should trigger breach in HYBRID mode if price crosses trigger", () => {
    const safeHf = 13000n; // 1.30 > 1.10
    const breachedPrice = 44_0000000n; // $44.00 <= $44.20

    const isBreached = riskEngine.isTriggerBreached(safeHf, breachedPrice, baseConfig);
    expect(isBreached).toBe(true);
  });

  it("should trigger breach in HYBRID mode if health factor crosses trigger", () => {
    const breachedHf = 10800n; // 1.08 <= 1.10
    const safePrice = 50_0000000n; // $50.00 > $44.20

    const isBreached = riskEngine.isTriggerBreached(breachedHf, safePrice, baseConfig);
    expect(isBreached).toBe(true);
  });

  it("should recommend 50% hedge size when hedgeRatioBps is 5000", () => {
    // Mark price drops to $42.00 (scaled 1e8)
    const lowPrice = 42_00000000n;
    const result = riskEngine.evaluatePosition(basePosition, lowPrice);

    expect(result.isTriggerBreached).toBe(true);
    expect(result.vaultState).toBe(VaultState.ARMED);
    // 50% of 1000 HYPE = 500 HYPE
    expect(result.recommendedHedgeSize).toBe(ethers.parseUnits("500", 18));
  });
});
