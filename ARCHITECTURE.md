# predict-me Backend — Architecture

How the backend fits into the predict-me system, what it does in v1, and what it's designed to become.

---

## Role in v1: Read-Only Indexer

The backend is a thin read-only layer between the frontend and the Soroban contract. Its only job in v1 is to query the contract and return normalised JSON. There is no database, no authentication, and no write operations.

```
┌─────────────────────────────────────────────────────────┐
│              Next.js Frontend  (App Router)              │
│                                                          │
│  app/page.tsx         GET /markets                       │
│  app/market/[id]      GET /markets/:id                   │
└──────────────────────────┬──────────────────────────────┘
                           │  HTTP / JSON
                           ▼
┌─────────────────────────────────────────────────────────┐
│           predict-me Backend  (this repo)                │
│                                                          │
│  GET /markets      →  fetchAllMarkets()                  │
│  GET /markets/:id  →  fetchMarketById(id)                │
│                                                          │
│  services/stellar.ts  — the only file that touches RPC  │
└──────────────────────────┬──────────────────────────────┘
                           │  Soroban RPC (simulateTransaction)
                           ▼
┌─────────────────────────────────────────────────────────┐
│           @stellar/stellar-sdk  (RPC client)             │
│           SOROBAN_RPC_URL                                │
└──────────────────────────┬──────────────────────────────┘
                           │  XDR
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Stellar Testnet / Soroban                   │
│         predict-me contract  (Rust WASM)                 │
│         contracts/src/lib.rs                             │
└─────────────────────────────────────────────────────────┘
```

---

## Why a Backend at All?

The frontend could query Soroban directly from the browser using `@stellar/stellar-sdk`. In v1 that would work fine. The backend exists to:

1. **Avoid exposing RPC calls to the client** — the contract address and RPC URL stay server-side
2. **Enable caching in v2** — a single in-memory or Redis cache here is far cheaper than N browser clients each hitting the RPC
3. **Enable off-chain enrichment** — market metadata (images, descriptions, tags) that can't go on-chain can be merged here before the response is sent
4. **Enable push notifications in v2** — a WebSocket layer here can stream odds updates to connected clients

---

## Source Layout

```
backend/src/
├── index.ts          App entrypoint — Express setup, route mounting, server start
├── config/
│   └── env.ts        Reads and validates all environment variables at startup
├── routes/
│   └── markets.ts    Route handlers — validate input, call services, return JSON
├── services/
│   └── stellar.ts    All chain interaction — simulateTransaction, XDR parsing
└── types/
    └── market.ts     ContractMarket (raw), MarketResponse (API), ApiError
```

**Rule:** routes never import from `@stellar/stellar-sdk` — all chain logic stays in `services/stellar.ts`. Routes call service functions and shape the HTTP response.

---

## Contract Query Strategy

All reads use `server.simulateTransaction()` — a Soroban RPC method that executes a contract function in a sandbox and returns the result without broadcasting. This means:

- No Stellar account needed — we use a dummy source account with sequence 0
- No fees — simulations are free
- No ledger state changes — purely read-only

`GET /markets` fetches the market count, then iterates from `id=0` to `count-1`, calling `get_market(id)` for each. In v1 this is sequential. In v2 it should be parallelised with `Promise.all` and cached.

---

## Data Normalisation

The contract stores pools in **stroops** (1 XLM = 10,000,000 stroops) as `i128`. The API normalises this to:

| Field | Contract (raw) | API response |
|---|---|---|
| `yes_pool` | `i128` stroops | `yesPercent: number` (0–100) |
| `no_pool` | `i128` stroops | `noPercent: number` (0–100) |
| `yes_pool + no_pool` | `i128` stroops | `totalPool: number` (XLM, 7dp) |
| `end_timestamp` | `u64` Unix seconds | `endsAt: string` (ISO 8601) |
| `status` | `u32` (0/1/2) | `status: "open" \| "resolved_yes" \| "resolved_no"` |

The raw values are also returned under the `raw` key for clients that need precision.

The `MarketResponse` shape matches `frontend/lib/types.ts Market` interface exactly, so the frontend can swap `MOCK_MARKETS` for backend responses with no type changes.

---

## Error Handling

| Scenario | HTTP status | `code` field |
|---|---|---|
| Invalid market id (non-integer) | `400` | `INVALID_MARKET_ID` |
| Market not found on-chain | `404` | `MARKET_NOT_FOUND` |
| Contract unreachable / RPC error | `502` | `CONTRACT_QUERY_FAILED` |
| Unknown route | `404` | `NOT_FOUND` |

When the contract is not yet deployed, `fetchAllMarkets()` catches the connection error and returns an empty array rather than crashing. This lets the backend run and the frontend get a valid (empty) response during development.

---

## v2 Roadmap

These are intentionally deferred from v1:

| Feature | Notes |
|---|---|
| **In-memory cache** | Cache `GET /markets` for 30–60s. Invalidate on new block. |
| **Redis / database** | Persist indexed state so restarts don't re-query the whole chain. |
| **WebSocket live odds** | Push odds updates to subscribed clients as new `buy_shares` txs land. |
| **Event indexing** | Listen to contract events instead of polling. Requires Stellar event streaming. |
| **Off-chain metadata** | Market images, descriptions, source URLs stored alongside contract data. |
| **Authentication** | JWT or Stellar signature-based auth for admin endpoints. |
| **Rate limiting** | `express-rate-limit` on RPC-heavy routes. |
| **Parallel market fetching** | `Promise.all` for `fetchAllMarkets` once there are many markets. |

---

## Related Repos

- **Frontend:** [predict-me-frontend](https://github.com/SolveForgeHQ/predict-me-frontend)
- **Contracts:** [predict-me-contracts](https://github.com/SolveForgeHQ/predict-me-contracts)
