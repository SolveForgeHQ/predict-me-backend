// types/market.ts
// TypeScript types for the backend. These mirror the Soroban contract's
// on-chain MarketState (see contracts/src/storage.rs) and match the
// shape expected by the frontend (see frontend/lib/types.ts).

// Maps contract status u32 → string
// 0 = Open, 1 = ResolvedYes, 2 = ResolvedNo  (storage.rs:MarketState.status)
export type MarketStatus = "open" | "resolved_yes" | "resolved_no";

/**
 * On-chain representation, parsed from Soroban contract XDR.
 * Field names match the contract's MarketState struct in storage.rs.
 */
export interface ContractMarket {
  /** u32 market_id from DataKey::MarketCount */
  id: number;
  question: string;
  category: string;
  /** Unix timestamp (seconds) — contract field: end_timestamp */
  endTimestamp: number;
  /** XLM in stroops — contract field: yes_pool */
  yesPool: bigint;
  /** XLM in stroops — contract field: no_pool */
  noPool: bigint;
  /** 0 = Open, 1 = ResolvedYes, 2 = ResolvedNo */
  statusCode: number;
}

/**
 * Normalised response shape returned by the API.
 * Matches frontend/lib/types.ts Market interface so the frontend
 * can swap mock data for backend responses with no type changes.
 */
export interface MarketResponse {
  id: string;
  question: string;
  category: string;
  /** Percentage of total pool on YES side (0–100) */
  yesPercent: number;
  /** Percentage of total pool on NO side (0–100) */
  noPercent: number;
  /** Total pool in XLM (human-readable, 7 decimal places) */
  totalPool: number;
  /** ISO 8601 resolution deadline */
  endsAt: string;
  status: MarketStatus;
  /** Raw pool sizes in stroops for precision-sensitive clients */
  raw: {
    yesPool: string;
    noPool: string;
    endTimestamp: number;
  };
}

/** Standard error envelope returned by all routes on failure */
export interface ApiError {
  error: string;
  code: string;
}
