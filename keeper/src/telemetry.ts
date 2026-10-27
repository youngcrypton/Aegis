import { WebSocket } from "ws";
import { ethers } from "ethers";
import { config } from "./config.js";

export interface MarkPriceData {
  perpIndex: number;
  markPrice: bigint; // Scaled 1e8 ($1 = 100,000,000)
  indexPrice: bigint; // Scaled 1e8
  depthBid: bigint; // Scaled 1e18
  depthAsk: bigint; // Scaled 1e18
  timestamp: number;
}

export type BlockCallback = (blockNumber: number, timestamp: number) => Promise<void> | void;

export class TelemetryService {
  private ws: WebSocket | null = null;
  private provider: ethers.JsonRpcProvider;
  private blockCallbacks: BlockCallback[] = [];
  private isRunning: boolean = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private lastBlockNumber: number = 0;
  private wsReconnectAttempts: number = 0;
  private consecutivePollErrors: number = 0;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.ELYSIUM_RPC_URL);
  }

  public getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  public onBlock(cb: BlockCallback): void {
    this.blockCallbacks.push(cb);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.connectWebSocket();
    this.startPollingFallback();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private connectWebSocket(): void {
    if (!this.isRunning) return;
    try {
      this.ws = new WebSocket(config.ELYSIUM_WS_URL);

      this.ws.on("open", () => {
        this.wsReconnectAttempts = 0;
        console.log(`[Telemetry] Connected to Elysium WebSocket: ${config.ELYSIUM_WS_URL}`);
        this.ws?.send(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_subscribe",
            params: ["newHeads"]
          })
        );
      });

      this.ws.on("message", (data: Buffer | string) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.params && msg.params.result) {
            const blockNum = parseInt(msg.params.result.number, 16);
            const ts = parseInt(msg.params.result.timestamp, 16);
            if (blockNum > this.lastBlockNumber) {
              this.lastBlockNumber = blockNum;
              this.notifyBlock(blockNum, ts);
            }
          }
        } catch {
          // Ignore malformed WS frames
        }
      });

      this.ws.on("error", (err) => {
        console.warn(`[Telemetry] WebSocket notice: ${err.message}. Polling active.`);
      });

      this.ws.on("close", () => {
        if (this.isRunning) {
          this.wsReconnectAttempts++;
          // Exponential backoff with jitter (max 30s)
          const baseDelay = Math.min(1500 * Math.pow(1.5, this.wsReconnectAttempts - 1), 30000);
          const jitter = Math.floor(Math.random() * 1000);
          const delay = Math.round(baseDelay + jitter);
          console.warn(`[Telemetry] WebSocket closed. Reconnecting in ${delay}ms (attempt #${this.wsReconnectAttempts})...`);
          this.reconnectTimeout = setTimeout(() => this.connectWebSocket(), delay);
        }
      });
    } catch {
      console.warn(`[Telemetry] Failed to initiate WebSocket. Polling fallback active.`);
    }
  }

  private startPollingFallback(): void {
    const poll = async () => {
      if (!this.isRunning) return;
      let nextDelay = config.POLL_INTERVAL_MS;

      try {
        const blockNumber = await this.provider.getBlockNumber();
        if (this.consecutivePollErrors > 0) {
          console.log(`[Telemetry] RPC connection restored after ${this.consecutivePollErrors} failed attempts.`);
          this.consecutivePollErrors = 0;
        }

        if (blockNumber > this.lastBlockNumber) {
          this.lastBlockNumber = blockNumber;
          const block = await this.provider.getBlock(blockNumber);
          const timestamp = block ? Number(block.timestamp) : Math.floor(Date.now() / 1000);
          this.notifyBlock(blockNumber, timestamp);
        }
      } catch (err: any) {
        this.consecutivePollErrors++;
        // Circuit breaker: back off dynamically when RPC is unavailable to prevent resource exhaustion
        nextDelay = Math.min(
          config.POLL_INTERVAL_MS * Math.pow(2, Math.min(this.consecutivePollErrors, 7)),
          15000
        );

        if (this.consecutivePollErrors === 1 || this.consecutivePollErrors % 10 === 0) {
          console.warn(
            `[Telemetry] Polling error (#${this.consecutivePollErrors}): ${err?.message || "RPC unreachable"}. Circuit breaker backoff: next poll in ${nextDelay}ms`
          );
        }

        if (config.DRY_RUN) {
          this.lastBlockNumber++;
          this.notifyBlock(this.lastBlockNumber, Math.floor(Date.now() / 1000));
        }
      } finally {
        if (this.isRunning) {
          setTimeout(poll, nextDelay);
        }
      }
    };
    poll();
  }

  private notifyBlock(blockNum: number, ts: number): void {
    for (const cb of this.blockCallbacks) {
      try {
        cb(blockNum, ts);
      } catch (err) {
        console.error(`[Telemetry] Error in block callback:`, err);
      }
    }
  }

  public async getMarkPrice(perpIndex: number): Promise<MarkPriceData> {
    const selector = "0x3a4b9c1d";
    const encodedIndex = ethers.AbiCoder.defaultAbiCoder().encode(["uint32"], [perpIndex]);
    const callData = ethers.concat([selector, encodedIndex]);

    const result = await this.provider.call({
      to: "0x0000000000000000000000000000000000000801",
      data: callData
    });

    if (!result || result === "0x") {
      // Stock ArbOS testnet/day 1 mainnet: Fallback to RelayedOracleAdapter if configured
      if (config.RELAYED_ORACLE_ADAPTER_ADDRESS !== ethers.ZeroAddress) {
        try {
          const adapterSelector = "0xc65e1eb4"; // getPerpPriceWithTimestamp(uint32)
          const adapterCalldata = ethers.concat([adapterSelector, encodedIndex]);
          const adapterResult = await this.provider.call({
            to: config.RELAYED_ORACLE_ADAPTER_ADDRESS,
            data: adapterCalldata
          });
          if (adapterResult && adapterResult !== "0x" && adapterResult.length >= 130) {
            const [relayedPrice, relayedTs] = ethers.AbiCoder.defaultAbiCoder().decode(
              ["uint256", "uint256"],
              adapterResult
            );
            const relayedPriceBigInt = BigInt(relayedPrice);
            if (relayedPriceBigInt > 0n) {
              return {
                perpIndex,
                markPrice: relayedPriceBigInt,
                indexPrice: relayedPriceBigInt,
                depthBid: ethers.parseUnits("50000", 18),
                depthAsk: ethers.parseUnits("50000", 18),
                timestamp: Number(relayedTs)
              };
            }
          }
        } catch {
          // Fall through to throw
        }
      }
      throw new Error(`Oracle read failed: Precompile 0x0801 returned empty data for perp ${perpIndex}`);
    }

    // Must be at least 32 bytes (66 hex characters including 0x prefix)
    if (result.length < 66) {
      throw new Error(
        `Oracle read failed: Precompile 0x0801 returned malformed data (length ${result.length}) for perp ${perpIndex}`
      );
    }

    if (result.length >= 322) {
      const [markPrice, indexPrice, depthBid, depthAsk, timestamp] =
        ethers.AbiCoder.defaultAbiCoder().decode(
          ["uint256", "uint256", "uint256", "uint256", "uint256"],
          result
        );
      const markPriceBigInt = BigInt(markPrice);
      if (markPriceBigInt <= 0n) {
        throw new Error(
          `Oracle read failed: Precompile 0x0801 returned non-positive price (${markPriceBigInt.toString()}) for perp ${perpIndex}`
        );
      }
      return {
        perpIndex,
        markPrice: markPriceBigInt,
        indexPrice: BigInt(indexPrice),
        depthBid: BigInt(depthBid),
        depthAsk: BigInt(depthAsk),
        timestamp: Number(timestamp)
      };
    } else {
      const [markPrice] = ethers.AbiCoder.defaultAbiCoder().decode(["uint256"], result);
      const markPriceBigInt = BigInt(markPrice);
      if (markPriceBigInt <= 0n) {
        throw new Error(
          `Oracle read failed: Precompile 0x0801 returned non-positive price (${markPriceBigInt.toString()}) for perp ${perpIndex}`
        );
      }
      return {
        perpIndex,
        markPrice: markPriceBigInt,
        indexPrice: markPriceBigInt,
        depthBid: 0n,
        depthAsk: 0n,
        timestamp: Math.floor(Date.now() / 1000)
      };
    }
  }
}
