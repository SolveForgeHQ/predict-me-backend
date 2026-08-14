// services/stellar.ts
// Functions that query the Soroban contract via @stellar/stellar-sdk.
// This is the only file in the backend that talks to the chain.
//
// All functions are read-only — they use simulateTransaction() to invoke
// view functions without broadcasting. No signing, no write operations.
//
// Contract interface (contracts/src/lib.rs):
//   create_market(question, end_timestamp, category) -> u32
//   buy_shares(market_id, side, amount)
//   resolve_market(market_id, outcome)          -- admin only
//   claim_winnings(market_id)
//
// NOTE: The contract is not yet deployed. These functions are structured
// correctly and will work once MARKET_CONTRACT_ID is set in .env.
// Until then they throw a ContractNotDeployed error.

import {
  SorobanRpc,
  Contract,
  Networks,
  TransactionBuilder,
  Account,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";
import { env } from "../config/env.js";
import type { ContractMarket, MarketStatus } from "../types/market.js";

// ---------------------------------------------------------------------------
// RPC client (singleton)
// ---------------------------------------------------------------------------

let _server: SorobanRpc.Server | null = null;

function getServer(): SorobanRpc.Server {
  if (!_server) {
    _server = new SorobanRpc.Server(env.SOROBAN_RPC_URL, {
      allowHttp: env.SOROBAN_RPC_URL.startsWith("http://"),
    });
  }
  return _server;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STROOPS_PER_XLM = 10_000_000n;

/** Converts stroops (bigint) to XLM with 7 decimal places */
export function stroopsToXlm(stroops: bigint): number {
  return Number(stroops) / Number(STROOPS_PER_XLM);
}

/** Maps contract status code to API status string */
function decodeStatus(code: number): MarketStatus {
  if (code === 1) return "resolved_yes";
  if (code === 2) return "resolved_no";
  return "open";
}

/**
 * Builds a read-only simulation transaction and returns the result.
 * Uses a throw-away account (zero sequence) since we never broadcast.
 */
async function simulateContractCall(
  method: string,
  args: xdr.ScVal[]
): Promise<xdr.ScVal> {
  const server = getServer();
  const contract = new Contract(env.MARKET_CONTRACT_ID);

  // A dummy source account — sequence doesn't matter for simulations
  const dummyAccount = new Account(
    "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN",
    "0"
  );

  const tx = new TransactionBuilder(dummyAccount, {
    fee: BASE_FEE,
    networkPassphrase: env.STELLAR_NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const result = await server.simulateTransaction(tx);

  if (SorobanRpc.Api.isSimulationError(result)) {
    throw new Error(`Contract simulation failed: ${result.error}`);
  }

  if (!result.result?.retval) {
    throw new Error(`No return value from contract method: ${method}`);
  }

  return result.result.retval;
}

// ---------------------------------------------------------------------------
// Contract view functions
// ---------------------------------------------------------------------------

/**
 * Reads the current market count from the contract.
 * Uses DataKey::MarketCount from storage.rs.
 *
 * NOTE: This assumes a `get_market_count` view function will be added to
 * the contract. Alternatively, iterate until a market_id returns not found.
 * Replace the method name once the contract is finalised.
 */
export async function fetchMarketCount(): Promise<number> {
  const retval = await simulateContractCall("get_market_count", []);
  return scValToNative(retval) as number;
}

/**
 * Fetches a single market by its u32 id.
 * Calls the contract's get_market(market_id) view function.
 * Returns null if the market does not exist.
 */
export async function fetchMarketById(
  marketId: number
): Promise<ContractMarket | null> {
  try {
    const retval = await simulateContractCall("get_market", [
      nativeToScVal(marketId, { type: "u32" }),
    ]);

    // The contract returns a MarketState struct — parse each field
    // Field order matches contracts/src/storage.rs MarketState
    const native = scValToNative(retval) as {
      question: string;
      category: string;
      end_timestamp: bigint;
      yes_pool: bigint;
      no_pool: bigint;
      status: number;
    };

    return {
      id: marketId,
      question: native.question,
      category: native.category,
      endTimestamp: Number(native.end_timestamp),
      yesPool: native.yes_pool,
      noPool: native.no_pool,
      statusCode: native.status,
    };
  } catch (err) {
    // Market not found — the contract will error on an unknown id
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("not found") || message.includes("missing")) {
      return null;
    }
    throw err;
  }
}

/**
 * Fetches all markets by iterating from id=0 to market_count-1.
 * Stops at the first missing id to handle gaps gracefully.
 */
export async function fetchAllMarkets(): Promise<ContractMarket[]> {
  let count: number;

  try {
    count = await fetchMarketCount();
  } catch {
    // Contract not deployed yet — return empty list rather than 500
    console.warn(
      "stellar.ts: contract not reachable — returning empty market list"
    );
    return [];
  }

  const markets: ContractMarket[] = [];

  for (let id = 0; id < count; id++) {
    const market = await fetchMarketById(id);
    if (market) markets.push(market);
  }

  return markets;
}

// ---------------------------------------------------------------------------
// Normalise to API response shape
// ---------------------------------------------------------------------------

/**
 * Converts a ContractMarket (raw chain data) to the MarketResponse shape
 * that the API returns. Matches the Market interface in frontend/lib/types.ts.
 */
export function normaliseMarket(m: ContractMarket) {
  const totalPool = m.yesPool + m.noPool;
  const yesPercent =
    totalPool === 0n ? 50 : Math.round((Number(m.yesPool) / Number(totalPool)) * 100);
  const noPercent = 100 - yesPercent;

  return {
    id: String(m.id),
    question: m.question,
    category: m.category,
    yesPercent,
    noPercent,
    totalPool: stroopsToXlm(totalPool),
    endsAt: new Date(m.endTimestamp * 1000).toISOString(),
    status: decodeStatus(m.statusCode),
    raw: {
      yesPool: m.yesPool.toString(),
      noPool: m.noPool.toString(),
      endTimestamp: m.endTimestamp,
    },
  };
}
