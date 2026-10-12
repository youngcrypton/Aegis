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
  SENTINEL_SESSION_PRIVATE_KEY: z
    .string()
    .regex(privateKeyRegex, "Invalid 32-byte hex private key")
    .default("0x0000000000000000000000000000000000000000000000000000000000000001"),
  SENTINEL_OPERATOR_ADDRESS: z
    .string()
    .regex(ethereumAddressRegex, "Invalid Ethereum address")
    .default("0x0000000000000000000000000000000000000000"),
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
  const result = configSchema.safeParse(env);
  if (!result.success) {
    console.error("Configuration validation error:", result.error.format());
    throw new Error("Invalid keeper configuration parameters");
  }
  return result.data;
}

export const config = loadConfig();
