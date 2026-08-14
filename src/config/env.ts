// config/env.ts
// Loads and validates environment variables at startup.
// Import `env` from this module anywhere you need config — never read
// process.env directly in the rest of the codebase.

import dotenv from "dotenv";

dotenv.config();

function require(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  /** Soroban RPC endpoint */
  SOROBAN_RPC_URL: require("SOROBAN_RPC_URL"),

  /** Deployed predict-me contract address (C...) */
  MARKET_CONTRACT_ID: require("MARKET_CONTRACT_ID"),

  /** Stellar network passphrase */
  STELLAR_NETWORK_PASSPHRASE: require("STELLAR_NETWORK_PASSPHRASE"),

  /** Express server port */
  PORT: parseInt(optional("PORT", "3001"), 10),

  /** Node environment */
  NODE_ENV: optional("NODE_ENV", "development"),
} as const;
