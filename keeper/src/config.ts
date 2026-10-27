import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
const privateKeyRegex = /^0x[a-fA-F0-9]{64}$/;

export const configSchema = z.object({
  ELYSIUM_RPC_URL: z.string().url().default("https://testnet-rpc.elysium.kinetiq.xyz"),
  ELYSIUM_WS_URL: z.string().default("wss://testnet-rpc.elysium.kinetiq.xyz"),
  HYPERCORE_RPC_URL: z.string().default("https://rpc.hyperliquid.xyz"),
  AEGIS_VAULT_ADDRESS: z
    .string()
    .regex(ethereumAddressRegex, "Invalid Ethereum address")
    .default("0x0000000000000000000000000000000000000000"),
  AEGIS_REGISTRY_ADDRESS: z
    .string()
    .regex(ethereumAddressRegex, "Invalid Ethereum address")
    .default("0x0000000000000000000000000000000000000000"),
  AEGIS_FEE_COLLECTOR_ADDRESS: z
    .string()
    .regex(ethereumAddressRegex, "Invalid Ethereum address")
    .default("0x0000000000000000000000000000000000000000"),
  AGENT_DISPATCH_ADAPTER_ADDRESS: z
    .string()
    .regex(ethereumAddressRegex, "Invalid Ethereum address")
    .default("0x0000000000000000000000000000000000000000"),
  RELAYED_ORACLE_ADAPTER_ADDRESS: z
    .string()
    .regex(ethereumAddressRegex, "Invalid Ethereum address")
    .default("0x0000000000000000000000000000000000000000"),
  USDC_ADDRESS: z
    .string()
    .regex(ethereumAddressRegex, "Invalid Ethereum address")
    .default("0x7D29d8047B905000459c0E80c34a26CeedcB47b2"), // Canonical Elysium Testnet USDC
  KEEPER_EXECUTION_MODE: z
    .enum(["HYPERCORE_AGENT", "ON_CHAIN_PRECOMPILE"])
    .default("HYPERCORE_AGENT"),
  HYPERCORE_API_URL: z.string().optional(),
  HYPERCORE_PRICE_API_URL: z.string().default("https://api.hyperliquid.xyz"),
  HYPERCORE_EXECUTION_API_URL: z.string().default("https://api.hyperliquid-testnet.xyz"),
  USE_HYPERCORE_L1_ORACLE: z
    .string()
    .transform((val) => val === "true" || val === "1")
    .or(z.boolean())
    .default(true),
  SENTINEL_SESSION_PRIVATE_KEY: z
    .string()
    .regex(privateKeyRegex, "Invalid 32-byte hex private key")
    .default("0x0000000000000000000000000000000000000000000000000000000000000001"),
  SENTINEL_OPERATOR_PRIVATE_KEY: z
    .string()
    .regex(privateKeyRegex, "Invalid 32-byte hex private key")
    .optional(),
  SENTINEL_OPERATOR_ADDRESS: z
    .string()
    .regex(ethereumAddressRegex, "Invalid Ethereum address")
    .default("0x0000000000000000000000000000000000000000"),
  SENTINEL_HEALTH_TOKEN: z.string().optional(),
  POLL_INTERVAL_MS: z.coerce.number().min(10).max(10000).default(100),
  MAX_SLIPPAGE_BPS: z.coerce.number().min(1).max(500).default(50),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  DRY_RUN: z
    .string()
    .transform((val) => val === "true" || val === "1")
    .or(z.boolean())
    .default(false),
  CHAIN_ID: z.coerce.number().default(99801)
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(env = process.env): Config {
  const mergedEnv: Record<string, any> = { ...env };

  // Fallback to deployments.json if contracts not explicitly set in env
  try {
    const fs = require("fs");
    const path = require("path");
    const candidatePaths = [
      path.resolve(process.cwd(), "deployments.json"),
      path.resolve(process.cwd(), "../deployments.json")
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        const raw = JSON.parse(fs.readFileSync(p, "utf8"));
        if (!mergedEnv.AEGIS_VAULT_ADDRESS && raw.aegisVault) mergedEnv.AEGIS_VAULT_ADDRESS = raw.aegisVault;
        if (!mergedEnv.AEGIS_REGISTRY_ADDRESS && raw.sentinelRegistry) mergedEnv.AEGIS_REGISTRY_ADDRESS = raw.sentinelRegistry;
        if (!mergedEnv.AEGIS_FEE_COLLECTOR_ADDRESS && raw.feeCollector) mergedEnv.AEGIS_FEE_COLLECTOR_ADDRESS = raw.feeCollector;
        if (!mergedEnv.AGENT_DISPATCH_ADAPTER_ADDRESS && raw.writerAdapter) mergedEnv.AGENT_DISPATCH_ADAPTER_ADDRESS = raw.writerAdapter;
        if (!mergedEnv.RELAYED_ORACLE_ADAPTER_ADDRESS && raw.oracleAdapter) mergedEnv.RELAYED_ORACLE_ADAPTER_ADDRESS = raw.oracleAdapter;
        if (!mergedEnv.USDC_ADDRESS && raw.usdc) mergedEnv.USDC_ADDRESS = raw.usdc;
        break;
      }
    }
  } catch {
    // Ignore optional deployments.json reading errors
  }

  const result = configSchema.safeParse(mergedEnv);
  if (!result.success) {
    console.error("Configuration validation error:", result.error.format());
    throw new Error("Invalid keeper configuration parameters");
  }
  return result.data;
}

export const config = loadConfig();
