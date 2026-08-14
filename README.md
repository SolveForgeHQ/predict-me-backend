# predict-me — Backend

A lightweight read-only indexer for the predict-me Soroban prediction market contract. Queries the deployed contract on Stellar Testnet and exposes market data as a JSON REST API so the frontend doesn't have to hit the chain directly on every page load.

> **Status: v0.1 scaffold.** Routes and service layer are structured and ready. Contract calls will succeed once `MARKET_CONTRACT_ID` is set to a deployed contract address in `.env`.

---

## Tech Stack

| | |
|---|---|
| Runtime | Node.js ≥ 20 |
| Framework | Express 4 |
| Language | TypeScript 5 |
| Stellar | `@stellar/stellar-sdk` v16 |
| Config | dotenv |

---

## Prerequisites

- Node.js ≥ 20
- npm or pnpm

---

## Setup

```bash
git clone https://github.com/SolveForgeHQ/predict-me-backend.git
cd predict-me-backend
npm install

cp .env.example .env
# Edit .env — set SOROBAN_RPC_URL, MARKET_CONTRACT_ID, STELLAR_NETWORK_PASSPHRASE
```

---

## Running

```bash
# Development (watch mode, auto-restarts on file change)
npm run dev

# Production
npm run build
npm start
```

Server starts on `http://localhost:3001` by default. Change `PORT` in `.env` to override.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start with ts-node-dev in watch mode |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled output from `dist/` |
| `npm run lint` | ESLint on `src/` |
| `npm run typecheck` | TypeScript type-check without emitting |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Required | Description |
|---|---|---|
| `SOROBAN_RPC_URL` | yes | Soroban RPC endpoint (testnet or mainnet) |
| `MARKET_CONTRACT_ID` | yes | Deployed contract address (`C...`) |
| `STELLAR_NETWORK_PASSPHRASE` | yes | Network passphrase |
| `PORT` | no | HTTP port (default: `3001`) |
| `NODE_ENV` | no | `development` or `production` |

```bash
# Testnet defaults
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

---

## API Routes

All routes are read-only. No authentication required.

### `GET /health`

Returns server status and config (no sensitive values).

```json
{
  "status": "ok",
  "service": "predict-me-backend",
  "version": "0.1.0",
  "timestamp": "2026-08-14T10:00:00.000Z",
  "contract": "C...",
  "network": "https://soroban-testnet.stellar.org"
}
```

### `GET /markets`

Returns all markets from the contract.

```json
{
  "markets": [
    {
      "id": "0",
      "question": "Will Nigeria qualify for AFCON 2027?",
      "category": "Sports",
      "yesPercent": 72,
      "noPercent": 28,
      "totalPool": 4.85,
      "endsAt": "2026-11-15T23:59:00.000Z",
      "status": "open",
      "raw": {
        "yesPool": "33950000",
        "noPool": "13550000",
        "endTimestamp": 1763337540
      }
    }
  ],
  "count": 1,
  "source": "contract"
}
```

Returns `{ markets: [], count: 0, source: "empty" }` if the contract has no markets yet.

### `GET /markets/:id`

Returns a single market by its numeric id.

```
GET /markets/0
```

Returns `404` with `{ error, code: "MARKET_NOT_FOUND" }` if the id doesn't exist.
Returns `400` with `{ error, code: "INVALID_MARKET_ID" }` if the id is not a valid integer.

---

## Project Structure

```
backend/
├── src/
│   ├── index.ts              Express app — middleware, routes, server start
│   ├── config/
│   │   └── env.ts            Loads and validates all env vars at startup
│   ├── routes/
│   │   └── markets.ts        GET /markets, GET /markets/:id
│   ├── services/
│   │   └── stellar.ts        All Soroban contract queries via stellar-sdk
│   └── types/
│       └── market.ts         ContractMarket, MarketResponse, ApiError types
├── .env.example              Template for required environment variables
├── package.json
└── tsconfig.json
```

---

## Related Repos

- **Frontend:** [predict-me-frontend](https://github.com/SolveForgeHQ/predict-me-frontend)
- **Contracts:** [predict-me-contracts](https://github.com/SolveForgeHQ/predict-me-contracts)
