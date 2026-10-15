import { describe, it, expect, beforeEach } from "@jest/globals";
import { ethers } from "ethers";
import { HyperCoreAgentClient, HYPERCORE_EIP712_DOMAIN, HYPERCORE_ORDER_TYPES } from "../src/hypercore_agent";

describe("HyperCoreAgentClient L1 Integration", () => {
  const testPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  let client: HyperCoreAgentClient;

  beforeEach(() => {
    client = new HyperCoreAgentClient(testPrivateKey, "https://api.hyperliquid-testnet.xyz");
  });

  it("should derive correct agent address from private key", () => {
    const expectedAddress = new ethers.Wallet(testPrivateKey).address;
    expect(client.getAgentAddress()).toBe(expectedAddress);
  });

  it("should format and simulate trade-only short hedge order in DRY_RUN", async () => {
    const params = {
      vaultOwner: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      perpIndex: 0,
      size: -10_000000000000000000n, // -10 HYPE base tokens
      limitPrice: 82_50000000n, // $82.50
      reduceOnly: false
    };

    const result = await client.submitTradeOnlyOrder(params);

    expect(result.success).toBe(true);
    expect(result.simulated).toBe(true);
    expect(result.side).toBe("SELL");
    expect(result.price).toBe("82.5000");
    expect(result.size).toBe("10.0000");
    expect(result.orderId).toContain("hc-dry-");
    expect(result.latencyMs).toBeGreaterThanOrEqual(100);
    expect(result.latencyMs).toBeLessThanOrEqual(250);
  });

  it("should format and simulate trade-only buy-to-close unwind order in DRY_RUN", async () => {
    const params = {
      vaultOwner: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      perpIndex: 0,
      size: 10_000000000000000000n, // +10 HYPE base tokens (unwind)
      limitPrice: 84_00000000n, // $84.00
      reduceOnly: true
    };

    const result = await client.submitTradeOnlyOrder(params);

    expect(result.success).toBe(true);
    expect(result.simulated).toBe(true);
    expect(result.side).toBe("BUY");
    expect(result.price).toBe("84.0000");
    expect(result.size).toBe("10.0000");
    expect(result.orderId).toContain("hc-dry-");
  });

  it("should produce a valid EIP-712 signature for trade-only agent action", async () => {
    const wallet = new ethers.Wallet(testPrivateKey);
    const connectionId = ethers.keccak256(ethers.toUtf8Bytes("test-connection"));
    const payload = {
      source: "aegis-sentinel-v1",
      connectionId
    };

    const signature = await wallet.signTypedData(
      HYPERCORE_EIP712_DOMAIN,
      HYPERCORE_ORDER_TYPES,
      payload
    );

    const recovered = ethers.verifyTypedData(
      HYPERCORE_EIP712_DOMAIN,
      HYPERCORE_ORDER_TYPES,
      payload,
      signature
    );

    expect(recovered.toLowerCase()).toBe(wallet.address.toLowerCase());
  });

  it("should provide resilient fallback mark price if Info API is unreachable", async () => {
    // Calling with non-existent symbol triggers fallback
    const price = await client.getL1MarkPrice("NON_EXISTENT_COIN_XYZ");
    expect(price).toBeGreaterThan(0n);
  });
});
