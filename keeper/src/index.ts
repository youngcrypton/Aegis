import http from "http";
import { ethers } from "ethers";
import { config } from "./config.js";
import { TelemetryService, MarkPriceData } from "./telemetry.js";
import { RiskEngine, VaultPositionData, ProConfigData } from "./risk_engine.js";
import { TrailingTracker } from "./trailing_tracker.js";
import { OrderSigner } from "./order_signer.js";
import { HyperCoreAgentClient } from "./hypercore_agent.js";

// Minimal ABIs for interacting with AEGIS contracts
const VAULT_ABI = [
  "function getPosition(address vaultOwner) view returns (tuple(address owner, uint16 liquidationThresholdBps, uint48 lastHedgeBlock, address collateralToken, uint96 collateralAmount, uint256 debtAmountUsdc, address sessionKey))",
  "function getProConfig(address vaultOwner) view returns (tuple(uint8 triggerMode, uint8 orderType, uint16 hedgeRatioBps, uint16 trailingTakeProfitBps, uint16 maxSlippageBps, uint48 sessionKeyExpiry, bool manualOverrideActive, uint256 priceTrigger, uint256 healthFactorTrigger))",
  "function getActiveHedge(address vaultOwner) view returns (tuple(bool isOpen, uint32 perpMarketIndex, uint256 size, uint256 entryPrice, uint256 lowestWickPrice, uint256 trailingExitPrice))",
  "function vaultNonces(address vaultOwner) view returns (uint256)",
  "function executeHedgeIntent(address vaultOwner, uint32 perpIndex, int256 size, uint256 limitPrice, uint256 deadline, bytes signature)",
  "function executeUnwindIntent(address vaultOwner, uint32 perpIndex, uint256 exitPrice, uint256 deadline, bytes signature)"
];

const REGISTRY_ABI = [
  "function isSentinelActive(address operator) view returns (bool)",
  "function getSentinel(address operator) view returns (tuple(address operator, uint256 bondedAmount, bool isActive, uint32 successfulHedges, uint16 slashCount))",
  "function MIN_BOND() view returns (uint256)"
];

const AGENT_DISPATCH_ABI = [
  "event AgentHedgeIntentDispatched(address indexed vault, uint32 indexed perpIndex, int256 size, uint256 limitPrice, uint256 timestamp)",
  "event AgentHedgeIntentCancelled(address indexed vault, uint32 indexed perpIndex, uint256 timestamp)"
];

const RELAYED_ORACLE_ABI = [
  "function getPerpPrice(uint32 perpIndex) view returns (uint256)",
  "function getPerpPriceWithTimestamp(uint32 perpIndex) view returns (uint256 markPrice, uint256 timestamp)",
  "function updatePrice(uint32 perpIndex, uint256 price)",
  "function maxStaleness() view returns (uint256)"
];

export class SentinelKeeperDaemon {
  private telemetry: TelemetryService;
  private riskEngine: RiskEngine;
  private trailingTracker: TrailingTracker;
  private orderSigner: OrderSigner;
  private hyperCoreAgent: HyperCoreAgentClient;
  private vaultContract: ethers.Contract | null = null;
  private registryContract: ethers.Contract | null = null;
  private agentDispatchContract: ethers.Contract | null = null;
  private relayedOracleContract: ethers.Contract | null = null;
  private monitoredVaults: Set<string> = new Set();
  private processedIntents: Set<string> = new Set();
  private isProcessingBlock: boolean = false;
  private healthServer: http.Server | null = null;
  private lastProcessedBlock: number = 0;
  private lastBlockTimestamp: number = 0;

  constructor() {
    this.telemetry = new TelemetryService();
    this.riskEngine = new RiskEngine();
    this.trailingTracker = new TrailingTracker();
    this.orderSigner = new OrderSigner(
      config.SENTINEL_SESSION_PRIVATE_KEY,
      config.AEGIS_VAULT_ADDRESS,
      config.CHAIN_ID
    );
    this.hyperCoreAgent = new HyperCoreAgentClient(
      config.SENTINEL_SESSION_PRIVATE_KEY,
      config.HYPERCORE_API_URL
    );

    const provider = this.telemetry.getProvider();
    const relayerKey = config.SENTINEL_OPERATOR_PRIVATE_KEY || config.SENTINEL_SESSION_PRIVATE_KEY;
    const relayerWallet = new ethers.Wallet(relayerKey, provider);

    if (config.AEGIS_VAULT_ADDRESS !== ethers.ZeroAddress) {
      this.vaultContract = new ethers.Contract(config.AEGIS_VAULT_ADDRESS, VAULT_ABI, relayerWallet);
    }
    if (config.AEGIS_REGISTRY_ADDRESS !== ethers.ZeroAddress) {
      this.registryContract = new ethers.Contract(
        config.AEGIS_REGISTRY_ADDRESS,
        REGISTRY_ABI,
        relayerWallet
      );
    }
    if (config.AGENT_DISPATCH_ADAPTER_ADDRESS !== ethers.ZeroAddress) {
      this.agentDispatchContract = new ethers.Contract(
        config.AGENT_DISPATCH_ADAPTER_ADDRESS,
        AGENT_DISPATCH_ABI,
        provider
      );
    }
    if (config.RELAYED_ORACLE_ADAPTER_ADDRESS !== ethers.ZeroAddress) {
      this.relayedOracleContract = new ethers.Contract(
        config.RELAYED_ORACLE_ADAPTER_ADDRESS,
        RELAYED_ORACLE_ABI,
        relayerWallet
      );
    }
  }

  public addMonitoredVault(vaultAddress: string): void {
    this.monitoredVaults.add(vaultAddress.toLowerCase());
  }

  public async start(): Promise<void> {
    console.log("=================================================================");
    console.log("     AEGIS PROTOCOL — AUTONOMOUS SENTINEL RISK KEEPER DAEMON     ");
    console.log("=================================================================");
    console.log(`[Init] Chain ID:           ${config.CHAIN_ID}`);
    console.log(`[Init] Execution Mode:     ${config.KEEPER_EXECUTION_MODE}`);
    console.log(`[Init] Operator Address:   ${config.SENTINEL_OPERATOR_ADDRESS}`);
    console.log(`[Init] Session Key Signer: ${this.orderSigner.getSignerAddress()}`);
    console.log(`[Init] HyperCore Agent:    ${this.hyperCoreAgent.getAgentAddress()}`);
    console.log(`[Init] Vault Contract:     ${config.AEGIS_VAULT_ADDRESS}`);
    console.log(`[Init] Registry Contract:  ${config.AEGIS_REGISTRY_ADDRESS}`);
    console.log(`[Init] Agent Dispatch:     ${config.AGENT_DISPATCH_ADAPTER_ADDRESS}`);
    console.log(`[Init] Relayed Oracle:     ${config.RELAYED_ORACLE_ADAPTER_ADDRESS}`);
    console.log(`[Init] Canonical USDC:     ${config.USDC_ADDRESS}`);
    console.log(`[Init] Dry Run:            ${config.DRY_RUN}`);

    const defaultMonitored = process.env.MONITORED_VAULTS || "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
    for (const v of defaultMonitored.split(",")) {
      const addr = v.trim();
      if (addr && ethers.isAddress(addr)) {
        this.addMonitoredVault(addr);
        console.log(`[Init] Registered Monitored Vault: ${addr}`);
      }
    }

    await this.verifySentinelStatus();
    this.startHealthServer(parseInt(process.env.HEALTH_PORT || "8080", 10));

    this.listenToAgentDispatchEvents();

    this.telemetry.onBlock(async (blockNumber: number, timestamp: number) => {
      await this.handleBlock(blockNumber, timestamp);
    });

    this.telemetry.start();
    console.log("[Keeper] Telemetry monitoring online. Listening for block events...");
  }

  public stop(): void {
    console.log("[Keeper] Shutting down Sentinel daemon...");
    this.stopHealthServer();
    this.telemetry.stop();
  }

  private async verifySentinelStatus(): Promise<void> {
    if (config.DRY_RUN || !this.registryContract) {
      console.log("[Keeper] Dry-run mode enabled or contracts unlinked. Skipping on-chain stake verification.");
      return;
    }

    try {
      const isActive: boolean = await this.registryContract.isSentinelActive(
        config.SENTINEL_OPERATOR_ADDRESS
      );
      if (!isActive) {
        console.warn(
          `[Warning] Operator ${config.SENTINEL_OPERATOR_ADDRESS} is NOT active in SentinelRegistry.`
        );
      } else {
        console.log(`[Keeper] Operator active & bonded (>= 25,000 $AEGIS stake confirmed).`);
      }
    } catch (err: any) {
      console.warn(`[Keeper] Could not verify Sentinel registry status: ${err.message}`);
    }
  }

  private async handleBlock(blockNumber: number, timestamp: number): Promise<void> {
    if (this.isProcessingBlock) return;
    this.isProcessingBlock = true;
    this.lastProcessedBlock = blockNumber;
    this.lastBlockTimestamp = timestamp;

    try {
      const defaultPerpIndex = 0; // HYPE/USDC perp market
      let markPriceData: MarkPriceData;

      try {
        markPriceData = await this.telemetry.getMarkPrice(defaultPerpIndex);
      } catch (oracleErr: any) {
        if (config.USE_HYPERCORE_L1_ORACLE) {
          const l1Price = await this.hyperCoreAgent.getL1MarkPrice("HYPE");
          markPriceData = {
            perpIndex: defaultPerpIndex,
            markPrice: l1Price,
            indexPrice: l1Price,
            depthBid: ethers.parseUnits("50000", 18),
            depthAsk: ethers.parseUnits("50000", 18),
            timestamp
          };
        } else {
          throw oracleErr;
        }
      }

      const priceFormatted = (Number(markPriceData.markPrice) / 1e8).toFixed(2);
      console.log(
        `[Block #${blockNumber}] Mark Price: $${priceFormatted} | Depth: ${ethers.formatUnits(
          markPriceData.depthBid,
          18
        )} | Timestamp: ${timestamp}`
      );

      for (const vaultOwner of this.monitoredVaults) {
        await this.evaluateVault(vaultOwner, markPriceData, blockNumber, timestamp);
      }
    } catch (err: any) {
      console.error(`[Keeper] Error processing block #${blockNumber}:`, err.message);
    } finally {
      this.isProcessingBlock = false;
    }
  }

  private async evaluateVault(
    vaultOwner: string,
    markData: MarkPriceData,
    blockNumber: number,
    timestamp: number
  ): Promise<void> {
    if (!this.vaultContract || config.DRY_RUN) {
      return;
    }

    try {
      // 1. Fetch on-chain position & configuration
      const [posData, cfgData, hedgeData, currentNonce] = await Promise.all([
        this.vaultContract.getPosition(vaultOwner),
        this.vaultContract.getProConfig(vaultOwner),
        this.vaultContract.getActiveHedge(vaultOwner),
        this.vaultContract.vaultNonces(vaultOwner)
      ]);

      const configParsed: ProConfigData = {
        triggerMode: Number(cfgData.triggerMode),
        orderType: Number(cfgData.orderType),
        hedgeRatioBps: Number(cfgData.hedgeRatioBps),
        trailingTakeProfitBps: Number(cfgData.trailingTakeProfitBps),
        maxSlippageBps: Number(cfgData.maxSlippageBps),
        sessionKeyExpiry: Number(cfgData.sessionKeyExpiry),
        manualOverrideActive: Boolean(cfgData.manualOverrideActive),
        priceTrigger: BigInt(cfgData.priceTrigger),
        healthFactorTrigger: BigInt(cfgData.healthFactorTrigger)
      };

      // Invariant INV-3: Overridden positions must be strictly skipped
      if (configParsed.manualOverrideActive) {
        console.log(`[INV-3] Vault ${vaultOwner} has manualOverrideActive. Skipping.`);
        return;
      }

      // Check if session key is expired
      if (configParsed.sessionKeyExpiry < timestamp) {
        return;
      }

      const positionParsed: VaultPositionData = {
        vaultAddress: vaultOwner,
        owner: posData.owner,
        liquidationThresholdBps: Number(posData.liquidationThresholdBps),
        lastHedgeBlock: Number(posData.lastHedgeBlock),
        collateralToken: posData.collateralToken,
        collateralAmount: BigInt(posData.collateralAmount),
        debtAmountUsdc: BigInt(posData.debtAmountUsdc),
        sessionKey: posData.sessionKey,
        config: configParsed
      };

      // 2. Evaluate Trailing Unwind if Hedge is Active
      if (hedgeData.isOpen) {
        const trailingResult = this.trailingTracker.updatePrice(
          vaultOwner,
          markData.markPrice
        );

        if (trailingResult && trailingResult.isExitTriggered) {
          console.log(
            `[Unwind Triggered] Vault ${vaultOwner}: Price $${(
              Number(markData.markPrice) / 1e8
            ).toFixed(2)} crossed trailing exit $${(
              Number(trailingResult.trailingExitPrice) / 1e8
            ).toFixed(2)}. Unwinding!`
          );

          await this.dispatchUnwindIntent(
            vaultOwner,
            markData.perpIndex,
            markData.markPrice,
            BigInt(hedgeData.size),
            BigInt(currentNonce),
            timestamp
          );
        }
        return;
      }

      // 3. Evaluate Risk & Trigger Breach for Standby Position
      const risk = this.riskEngine.evaluatePosition(positionParsed, markData.markPrice);

      if (risk.isTriggerBreached && risk.recommendedHedgeSize > 0n) {
        console.log(
          `[Hedge Triggered] Vault ${vaultOwner}: ${risk.reason}. Sizing Q_hedge=${ethers.formatUnits(
            risk.recommendedHedgeSize,
            18
          )}`
        );

        await this.dispatchHedgeIntent(
          vaultOwner,
          markData.perpIndex,
          risk.recommendedHedgeSize,
          markData.markPrice,
          configParsed.maxSlippageBps,
          configParsed.trailingTakeProfitBps,
          BigInt(currentNonce),
          timestamp
        );
      }
    } catch (err: any) {
      console.error(`[Keeper] Error evaluating vault ${vaultOwner}:`, err.message);
    }
  }

  private async dispatchHedgeIntent(
    vaultOwner: string,
    perpIndex: number,
    size: bigint,
    markPrice: bigint,
    maxSlippageBps: number,
    trailingTakeProfitBps: number,
    nonce: bigint,
    timestamp: number
  ): Promise<void> {
    // Short order: negative size
    const shortSize = -size;
    // Limit price factoring in slippage: markPrice * (10000 - maxSlippageBps) / 10000
    const limitPrice = (markPrice * BigInt(10000 - maxSlippageBps)) / 10000n;
    const deadline = BigInt(timestamp + 300); // 5 minute validity

    // Sign EIP-712 structured intent via trade session key
    const signature = await this.orderSigner.signHedgeIntent({
      vault: vaultOwner,
      perpIndex,
      size: shortSize,
      limitPrice,
      nonce,
      deadline
    });

    console.log(`[OrderSigner] Signed EIP-712 hedge intent for vault ${vaultOwner}`);

    // Off-Chain Execution Loop: Submit trade-only order directly to HyperCore L1 matching engine
    const orderResult = await this.hyperCoreAgent.submitTradeOnlyOrder({
      vaultOwner,
      perpIndex,
      size: shortSize,
      limitPrice,
      reduceOnly: false
    });
    console.log(
      `[HyperCore CLOB] Trade-only order dispatched: OID=${orderResult.orderId} (Latency: ${orderResult.latencyMs}ms)`
    );

    if (this.vaultContract && !config.DRY_RUN) {
      const tx = await this.vaultContract.executeHedgeIntent(
        vaultOwner,
        perpIndex,
        shortSize,
        limitPrice,
        deadline,
        signature
      );
      console.log(`[Broadcast] Intent dispatched on-chain. TxHash: ${tx.hash}`);
      await tx.wait(1);

      // Register hedge into dynamic bottom-wick tracker
      this.trailingTracker.registerHedge(
        vaultOwner,
        perpIndex,
        size,
        markPrice,
        trailingTakeProfitBps
      );
    } else {
      this.trailingTracker.registerHedge(
        vaultOwner,
        perpIndex,
        size,
        markPrice,
        trailingTakeProfitBps
      );
    }
  }

  private async dispatchUnwindIntent(
    vaultOwner: string,
    perpIndex: number,
    exitPrice: bigint,
    unwindSize: bigint,
    nonce: bigint,
    timestamp: number
  ): Promise<void> {
    const deadline = BigInt(timestamp + 300);

    const signature = await this.orderSigner.signHedgeIntent({
      vault: vaultOwner,
      perpIndex,
      size: unwindSize, // Invariant: must match on-chain ActiveHedge.size for buy-to-close
      limitPrice: exitPrice,
      nonce,
      deadline
    });

    // Off-Chain Execution Loop: Submit buy-to-close unwind to HyperCore L1 CLOB
    const unwindResult = await this.hyperCoreAgent.submitTradeOnlyOrder({
      vaultOwner,
      perpIndex,
      size: unwindSize,
      limitPrice: exitPrice,
      reduceOnly: true
    });
    console.log(
      `[HyperCore CLOB] Trade-only unwind dispatched: OID=${unwindResult.orderId} (Latency: ${unwindResult.latencyMs}ms)`
    );

    if (this.vaultContract && !config.DRY_RUN) {
      const tx = await this.vaultContract.executeUnwindIntent(
        vaultOwner,
        perpIndex,
        exitPrice,
        deadline,
        signature
      );
      console.log(`[Broadcast] Unwind dispatched on-chain. TxHash: ${tx.hash}`);
      await tx.wait(1);

      this.trailingTracker.closeHedge(vaultOwner);
    } else {
      console.log(
        `[DRY_RUN] Signed unwind intent for ${vaultOwner}: size=${unwindSize.toString()}, exitPrice=${exitPrice.toString()}, nonce=${nonce.toString()}`
      );
      this.trailingTracker.closeHedge(vaultOwner);
    }
  }

  private listenToAgentDispatchEvents(): void {
    if (!this.agentDispatchContract) return;

    console.log(
      `[Keeper] Subscribed to AgentHedgeIntentDispatched on ${config.AGENT_DISPATCH_ADAPTER_ADDRESS}...`
    );

    this.agentDispatchContract.on(
      "AgentHedgeIntentDispatched",
      async (vault: string, perpIndex: any, size: any, limitPrice: any, timestamp: any) => {
        const intentKey = `${vault.toLowerCase()}-${perpIndex.toString()}-${timestamp.toString()}-${size.toString()}`;
        if (this.processedIntents.has(intentKey)) return;
        this.processedIntents.add(intentKey);

        console.log(
          `[Event:AgentDispatch] Captured AgentHedgeIntentDispatched for ${vault} (Perp: ${perpIndex}, Size: ${size.toString()}, Price: ${limitPrice.toString()})`
        );

        const orderResult = await this.hyperCoreAgent.submitTradeOnlyOrder({
          vaultOwner: vault,
          perpIndex: Number(perpIndex),
          size: BigInt(size),
          limitPrice: BigInt(limitPrice),
          reduceOnly: false
        });

        if (orderResult.success) {
          console.log(
            `[Off-Chain Execution Loop] Order successfully submitted to HyperCore L1! OID: ${orderResult.orderId} in ${orderResult.latencyMs}ms`
          );
          const absSize = BigInt(size) < 0n ? -BigInt(size) : BigInt(size);
          this.trailingTracker.registerHedge(
            vault,
            Number(perpIndex),
            absSize,
            BigInt(limitPrice),
            150
          );
        } else {
          console.error(
            `[Off-Chain Execution Loop] Failed to submit order to HyperCore: ${orderResult.error}`
          );
        }
      }
    );

    this.agentDispatchContract.on(
      "AgentHedgeIntentCancelled",
      async (vault: string, perpIndex: any) => {
        console.log(`[Event:AgentDispatch] Captured AgentHedgeIntentCancelled for ${vault}`);
        this.trailingTracker.closeHedge(vault);
      }
    );
  }

  public startHealthServer(port: number = 8080): void {
    this.healthServer = http.createServer((req, res) => {
      if (req.url === "/health" || req.url === "/") {
        const payload = {
          status: "healthy",
          uptimeSeconds: Math.floor(process.uptime()),
          chainId: config.CHAIN_ID,
          executionMode: config.KEEPER_EXECUTION_MODE,
          rpcUrl: config.ELYSIUM_RPC_URL,
          usdcAddress: config.USDC_ADDRESS,
          agentDispatchAddress: config.AGENT_DISPATCH_ADAPTER_ADDRESS,
          relayedOracleAddress: config.RELAYED_ORACLE_ADAPTER_ADDRESS,
          lastProcessedBlock: this.lastProcessedBlock,
          lastBlockTimestamp: this.lastBlockTimestamp,
          monitoredVaultsCount: this.monitoredVaults.size,
          activeHedgesCount: this.trailingTracker.getActiveCount(),
          operatorAddress: config.SENTINEL_OPERATOR_ADDRESS,
          timestamp: new Date().toISOString()
        };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(payload, null, 2));
      } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not Found");
      }
    });

    this.healthServer.listen(port, () => {
      console.log(`[Health] Sentinel HTTP health check listening on port ${port} (/health)`);
    });
  }

  public stopHealthServer(): void {
    if (this.healthServer) {
      this.healthServer.close();
      this.healthServer = null;
    }
  }
}

// Execution entrypoint when run as a standalone service
if (require.main === module) {
  const daemon = new SentinelKeeperDaemon();

  process.on("SIGINT", () => {
    daemon.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    daemon.stop();
    process.exit(0);
  });

  daemon.start().catch((err) => {
    console.error("[Fatal] Daemon encountered uncaught error:", err);
    process.exit(1);
  });
}
