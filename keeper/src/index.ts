import http from "http";
import { ethers } from "ethers";
import { config } from "./config.js";
import { TelemetryService, MarkPriceData } from "./telemetry.js";
import { RiskEngine, VaultPositionData, ProConfigData } from "./risk_engine.js";
import { TrailingTracker } from "./trailing_tracker.js";
import { OrderSigner } from "./order_signer.js";

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

export class SentinelKeeperDaemon {
  private telemetry: TelemetryService;
  private riskEngine: RiskEngine;
  private trailingTracker: TrailingTracker;
  private orderSigner: OrderSigner;
  private vaultContract: ethers.Contract | null = null;
  private registryContract: ethers.Contract | null = null;
  private monitoredVaults: Set<string> = new Set();
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
  }

  public addMonitoredVault(vaultAddress: string): void {
    this.monitoredVaults.add(vaultAddress.toLowerCase());
  }

  public async start(): Promise<void> {
    console.log("=================================================================");
    console.log("     AEGIS PROTOCOL — AUTONOMOUS SENTINEL RISK KEEPER DAEMON     ");
    console.log("=================================================================");
    console.log(`[Init] Chain ID:           ${config.CHAIN_ID}`);
    console.log(`[Init] Operator Address:   ${config.SENTINEL_OPERATOR_ADDRESS}`);
    console.log(`[Init] Session Key Signer: ${this.orderSigner.getSignerAddress()}`);
    console.log(`[Init] Vault Contract:     ${config.AEGIS_VAULT_ADDRESS}`);
    console.log(`[Init] Registry Contract:  ${config.AEGIS_REGISTRY_ADDRESS}`);
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
      const markPriceData: MarkPriceData = await this.telemetry.getMarkPrice(defaultPerpIndex);

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
    }
  }

  private async dispatchUnwindIntent(
    vaultOwner: string,
    perpIndex: number,
    exitPrice: bigint,
    nonce: bigint,
    timestamp: number
  ): Promise<void> {
    const deadline = BigInt(timestamp + 300);

    const signature = await this.orderSigner.signHedgeIntent({
      vault: vaultOwner,
      perpIndex,
      size: 0n, // Unwind uses dedicated executeUnwindIntent
      limitPrice: exitPrice,
      nonce,
      deadline
    });

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
    }
  }

  public startHealthServer(port: number = 8080): void {
    this.healthServer = http.createServer((req, res) => {
      if (req.url === "/health" || req.url === "/") {
        const payload = {
          status: "healthy",
          uptimeSeconds: Math.floor(process.uptime()),
          chainId: config.CHAIN_ID,
          rpcUrl: config.ELYSIUM_RPC_URL,
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
