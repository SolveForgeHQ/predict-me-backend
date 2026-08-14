# Contributing to predict-me Backend

Thanks for contributing to the predict-me backend. This guide covers setup, the service/route separation, what needs to be built in v2, and the PR workflow.

---

## Prerequisites

- Node.js ≥ 20
- npm (or pnpm — both work)

---

## Getting Started

```bash
git clone https://github.com/SolveForgeHQ/predict-me-backend.git
cd predict-me-backend
npm install

cp .env.example .env
# Fill in SOROBAN_RPC_URL, MARKET_CONTRACT_ID, STELLAR_NETWORK_PASSPHRASE
```

Start the dev server:

```bash
npm run dev     # watch mode — restarts on file change
```

Create a feature branch:

```bash
git checkout -b feat/your-feature
```

---

## Daily Commands

```bash
npm run dev        # dev server at localhost:3001
npm run build      # compile TypeScript → dist/
npm run typecheck  # type-check without emitting
npm run lint       # ESLint on src/
```

---

## Architecture Rules

Before adding code, read `ARCHITECTURE.md`. The key constraints:

- **Routes never import `@stellar/stellar-sdk`** — all chain interaction stays in `src/services/stellar.ts`
- **`env.ts` is the only file that reads `process.env`** — import `env` from `src/config/env.ts` everywhere else
- **No write operations in v1** — this backend is read-only. `POST`, `PUT`, `DELETE` routes are out of scope until v2

---

## File Responsibilities

| File | Purpose |
|---|---|
| `src/index.ts` | Middleware setup, route mounting, server start — no business logic |
| `src/config/env.ts` | Loads and validates env vars — add new vars here first |
| `src/routes/markets.ts` | Validates request params, calls service functions, shapes HTTP response |
| `src/services/stellar.ts` | All Soroban RPC calls — the only file that talks to the chain |
| `src/types/market.ts` | All TypeScript types — edit here when the contract schema changes |

---

## Adding a New Route

1. Add the handler to `src/routes/markets.ts` (or create a new router file for a new resource)
2. If the route needs new chain data, add a function to `src/services/stellar.ts`
3. If the route introduces a new response shape, add the type to `src/types/market.ts`
4. Mount new router files in `src/index.ts`

---

## v2 Ideas

These are explicitly out of scope for v1 but are the natural next steps:

| Feature | What it involves |
|---|---|
| **In-memory cache** | Wrap `fetchAllMarkets()` with a TTL cache (e.g. `node-cache`). Add a `Cache-Control` header to responses. |
| **Database / persistent index** | Postgres + Prisma or SQLite for persisted market state. Remove the chain round-trip on every request. |
| **WebSocket live odds** | `ws` or `socket.io` — push odds diffs to subscribed clients when new `buy_shares` transactions land. |
| **Contract event indexing** | Replace polling with Stellar event streaming (`server.getEvents()`). More efficient than iterating all market ids. |
| **Off-chain metadata** | Store market images, source article URLs, tags in the database alongside contract data. |
| **Parallel market fetching** | Replace sequential `for` loop in `fetchAllMarkets` with `Promise.all` once market counts grow. |
| **Rate limiting** | Add `express-rate-limit` on `/markets` to protect the RPC endpoint from abuse. |
| **Authentication** | JWT or Stellar-signature-based auth for future admin/write endpoints. |
| **`GET /markets/:id/positions/:address`** | Read a wallet's share balance from the contract for a given market. |

---

## Code Standards

- `npm run typecheck` must pass — no TypeScript errors
- `npm run lint` must pass — no ESLint errors
- No `any` types — use the interfaces in `src/types/market.ts`
- All functions in `stellar.ts` must be `async` and handle errors without crashing the process
- New environment variables must be added to both `.env.example` and `src/config/env.ts`

---

## Pull Requests

- One feature per PR
- Run `npm run build` and `npm run typecheck` before pushing
- PR description should cover: what route/service was added, what env vars are new, any breaking changes to response shape

---

## Commit Style

Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`

Examples:
```
feat: add GET /markets/:id/positions/:address route
feat: implement in-memory TTL cache for fetchAllMarkets
fix: handle missing market_count gracefully on undeployed contract
chore: add rate limiting middleware
docs: update ARCHITECTURE with caching layer diagram
```

---

## Questions

Open an issue or discussion on [GitHub](https://github.com/SolveForgeHQ/predict-me-backend).
