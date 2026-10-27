import * as http from "http";
import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import * as fs from "fs";
import * as path from "path";
import { ethers } from "ethers";
import { loadConfig } from "../src/config";
import { TelemetryService } from "../src/telemetry";
import { RiskEngine, VaultPositionData, TriggerMode, OrderType } from "../src/risk_engine";
import { SentinelKeeperDaemon } from "../src/index";

describe("Sentinel Keeper Testnet Configuration & Dual-Mode Wiring", () => {
  describe("1. Testnet Configuration & Canonical USDC Binding", () => {
    it("should default to Elysium Testnet RPC and Chain ID 99801", () => {
      const cfg = loadConfig({} as any);
      expect(cfg.ELYSIUM_RPC_URL).toBe("https://testnet-rpc.elysium.kinetiq.xyz");
      expect(cfg.ELYSIUM_WS_URL).toBe("wss://testnet-rpc.elysium.kinetiq.xyz");
      expect(cfg.CHAIN_ID).toBe(99801);
    });

    it("should default to canonical Elysium Testnet USDC address", () => {
      const cfg = loadConfig({} as any);
      expect(cfg.USDC_ADDRESS).toBe("0x7D29d8047B905000459c0E80c34a26CeedcB47b2");
    });

    it("should default to HYPERCORE_AGENT execution mode (Stock ArbOS)", () => {
      const cfg = loadConfig({} as any);
      expect(cfg.KEEPER_EXECUTION_MODE).toBe("HYPERCORE_AGENT");
    });

    it("should read contract addresses from deployments.json when not in env", () => {
      const cfg = loadConfig({} as any);
      const deployments = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, "../../deployments.json"), "utf8")
      );
      expect(cfg.AGENT_DISPATCH_ADAPTER_ADDRESS.toLowerCase()).toBe(
        deployments.writerAdapter.toLowerCase()
      );
      expect(cfg.RELAYED_ORACLE_ADAPTER_ADDRESS.toLowerCase()).toBe(
        deployments.oracleAdapter.toLowerCase()
      );
      expect(cfg.AEGIS_VAULT_ADDRESS.toLowerCase()).toBe(
        deployments.aegisVault.toLowerCase()
      );
    });
  });

  describe("2. Dual-Mode Relayed Oracle Telemetry Fallback", () => {
    let telemetry: TelemetryService;
    let mockProvider: {
      call: jest.Mock<any>;
      getBlockNumber: jest.Mock<any>;
      getBlock: jest.Mock<any>;
    };

    beforeEach(() => {
      telemetry = new TelemetryService();
      mockProvider = {
        call: jest.fn(),
        getBlockNumber: jest.fn(),
        getBlock: jest.fn()
      };
      (telemetry as any).provider = mockProvider;
    });

    afterEach(() => {
      telemetry.stop();
    });

    it("should resolve mark price via RelayedOracleAdapter when 0x0801 precompile returns 0x", async () => {
      const perpIndex = 0;
      const expectedRelayedPrice = 84_25000000n; // $84.25
      const expectedTimestamp = 1792020000n;

      // First call (to 0x0801) returns 0x (stock ArbOS behavior)
      // Second call (to RelayedOracleAdapter) returns encoded [price, timestamp]
      const encodedRelayed = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256", "uint256"],
        [expectedRelayedPrice, expectedTimestamp]
      );

      mockProvider.call
        .mockResolvedValueOnce("0x") // 0x0801 returns empty
        .mockResolvedValueOnce(encodedRelayed); // RelayedOracleAdapter returns price

      const result = await telemetry.getMarkPrice(perpIndex);

      expect(result.perpIndex).toBe(0);
      expect(result.markPrice).toBe(expectedRelayedPrice);
      expect(result.timestamp).toBe(Number(expectedTimestamp));
      expect(mockProvider.call).toHaveBeenCalledTimes(2);
    });
  });

  describe("3. Faucet Micro-Deposit Calibration & Canonical USDC Risk Engine", () => {
    const riskEngine = new RiskEngine();

    it("should correctly evaluate health factor for 0.05 HYPE faucet micro-deposit", () => {
      // 0.05 HYPE at $80 mark price = $4.00 collateral valuation
      // Debt = 2.00 USDC (2_000000n, 6 decimals)
      // Liquidation threshold = 80% (8000 bps)
      // HF = (0.05 * 80 * 0.80) / 2.00 = 3.20 / 2.00 = 1.60 (1_6000n in 1e4 scale)
      const collateral = ethers.parseEther("0.05"); // 0.05 HYPE (18 decimals)
      const markPrice = 80_00000000n; // $80.00 (8 decimals)
      const debtUsdc = 2_000000n; // $2.00 USDC (6 decimals)
      const thresholdBps = 8000;

      const hf = riskEngine.computeHealthFactor(collateral, markPrice, thresholdBps, debtUsdc);
      expect(hf).toBe(1_6000n); // 1.60
    });

    it("should trigger hedge when market drops and health factor breaches trigger", () => {
      // Position with 0.10 HYPE faucet allocation, debt $5.42 USDC
      const position: VaultPositionData = {
        vaultAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        owner: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        liquidationThresholdBps: 8000, // 80%
        lastHedgeBlock: 0,
        collateralToken: "0xCD57F65c2B0e5881CFC2E609F7CD53b746E1F234", // WHYPE
        collateralAmount: ethers.parseEther("0.10"), // 0.10 HYPE
        debtAmountUsdc: 5_420000n, // $5.42 canonical USDC
        sessionKey: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        config: {
          triggerMode: TriggerMode.HEALTH_FACTOR,
          orderType: OrderType.POST_ONLY_LIMIT,
          hedgeRatioBps: 10000, // 100% delta-hedge
          trailingTakeProfitBps: 150, // 1.5%
          maxSlippageBps: 50,
          sessionKeyExpiry: Math.floor(Date.now() / 1000) + 86400,
          manualOverrideActive: false,
          priceTrigger: 60_00000000n,
          healthFactorTrigger: 1_1500n // Trigger at HF <= 1.15
        }
      };

      // At $83.46: HF = (0.10 * 83.46 * 0.80) / 5.42 = 6.6768 / 5.42 = 1.2318 (Safe)
      const safePrice = 83_46000000n;
      const evalSafe = riskEngine.evaluatePosition(position, safePrice);
      expect(evalSafe.isTriggerBreached).toBe(false);

      // At $70.00: HF = (0.10 * 70.00 * 0.80) / 5.42 = 5.60 / 5.42 = 1.0332 (Breached <= 1.15!)
      const dropPrice = 70_00000000n;
      const evalBreached = riskEngine.evaluatePosition(position, dropPrice);
      expect(evalBreached.isTriggerBreached).toBe(true);
      expect(evalBreached.recommendedHedgeSize).toBe(ethers.parseEther("0.10"));
    });
  });

  describe("4. Health Endpoint Security, Data Minimization & Rate Limiting", () => {
    let daemon: SentinelKeeperDaemon;
    let serverPort: number;

    beforeEach(async () => {
      daemon = new SentinelKeeperDaemon();
      daemon.startHealthServer(0);
      const addr = (daemon as any).healthServer?.address();
      serverPort = typeof addr === "object" && addr ? addr.port : 8080;
    });

    afterEach(() => {
      daemon.stopHealthServer();
    });

    function makeRequest(
      path: string,
      method: string = "GET",
      headers: Record<string, string> = {}
    ): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: string }> {
      return new Promise((resolve, reject) => {
        const req = http.request(
          {
            hostname: "127.0.0.1",
            port: serverPort,
            path,
            method,
            headers
          },
          (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () =>
              resolve({
                statusCode: res.statusCode || 0,
                headers: res.headers,
                body: data
              })
            );
          }
        );
        req.on("error", reject);
        req.end();
      });
    }

    it("should return minimal liveness info on /health and prevent operational info leakage", async () => {
      const res = await makeRequest("/health");
      expect(res.statusCode).toBe(200);
      const payload = JSON.parse(res.body);

      expect(payload.status).toBe("healthy");
      expect(typeof payload.uptimeSeconds).toBe("number");
      expect(payload.chainId).toBe(99801);

      // Verify that sensitive internal topology is NOT leaked
      expect(payload.rpcUrl).toBeUndefined();
      expect(payload.operatorAddress).toBeUndefined();
      expect(payload.usdcAddress).toBeUndefined();
      expect(payload.agentDispatchAddress).toBeUndefined();
      expect(payload.relayedOracleAddress).toBeUndefined();
      expect(payload.monitoredVaultsCount).toBeUndefined();
      expect(payload.activeHedgesCount).toBeUndefined();
    });

    it("should reject non-GET and non-HEAD methods with 405 Method Not Allowed", async () => {
      const res = await makeRequest("/health", "POST");
      expect(res.statusCode).toBe(405);
      const payload = JSON.parse(res.body);
      expect(payload.error).toBe("Method Not Allowed");
    });

    it("should reject unauthorized requests to /diagnostics with 401", async () => {
      const res = await makeRequest("/diagnostics");
      expect(res.statusCode).toBe(401);
      const payload = JSON.parse(res.body);
      expect(payload.error).toContain("Unauthorized");
    });

    it("should enforce rate limiting and respond with 429 after exceeding limit", async () => {
      // Simulate rate limiter records for client
      for (let i = 0; i < 60; i++) {
        await makeRequest("/health");
      }
      // 61st request should be rate-limited
      const rateLimitedRes = await makeRequest("/health");
      expect(rateLimitedRes.statusCode).toBe(429);
      expect(rateLimitedRes.headers["retry-after"]).toBe("60");
      const payload = JSON.parse(rateLimitedRes.body);
      expect(payload.error).toBe("Too Many Requests");
    });
  });

  describe("5. Token Decimals Query & In-Memory Cache (AEG-REC-02)", () => {
    let keeper: SentinelKeeperDaemon;

    beforeEach(() => {
      keeper = new SentinelKeeperDaemon();
    });

    afterEach(() => {
      keeper.stop();
    });

    it("should return 18 for zero address or null without network calls", async () => {
      const decZero = await keeper.getCollateralDecimals(ethers.ZeroAddress);
      expect(decZero).toBe(18);

      const decNull = await keeper.getCollateralDecimals("");
      expect(decNull).toBe(18);
    });

    it("should query token.decimals() and cache result for multi-decimal tokens", async () => {
      const mockToken = "0x1111111111111111111111111111111111111111";
      const provider = (keeper as any).telemetry.getProvider();
      
      // Mock provider.call to return 8 (WBTC decimals: uint8)
      const encoded8 = ethers.AbiCoder.defaultAbiCoder().encode(["uint8"], [8]);
      const callSpy = jest.spyOn(provider, "call").mockResolvedValue(encoded8);

      const decFirst = await keeper.getCollateralDecimals(mockToken);
      expect(decFirst).toBe(8);
      expect(callSpy).toHaveBeenCalledTimes(1);

      // Second call should hit in-memory cache and not call provider
      const decSecond = await keeper.getCollateralDecimals(mockToken);
      expect(decSecond).toBe(8);
      expect(callSpy).toHaveBeenCalledTimes(1);

      callSpy.mockRestore();
    });

    it("should default to 18 on RPC error and cache default to prevent spam", async () => {
      const failingToken = "0x2222222222222222222222222222222222222222";
      const provider = (keeper as any).telemetry.getProvider();
      
      const callSpy = jest.spyOn(provider, "call").mockRejectedValue(new Error("RPC timeout"));

      const dec = await keeper.getCollateralDecimals(failingToken);
      expect(dec).toBe(18);
      expect(callSpy).toHaveBeenCalledTimes(1);

      // Subsequent call uses cached 18
      const decCached = await keeper.getCollateralDecimals(failingToken);
      expect(decCached).toBe(18);
      expect(callSpy).toHaveBeenCalledTimes(1);

      callSpy.mockRestore();
    });
  });
});


