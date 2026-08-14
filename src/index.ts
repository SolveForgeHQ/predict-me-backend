// index.ts
// Express app entrypoint for the predict-me backend.
//
// Responsibilities:
//   - Load and validate environment variables (config/env.ts)
//   - Mount routes
//   - Start the HTTP server
//
// This backend is a read-only indexer in v1.
// It queries the Soroban contract and returns JSON — no database, no auth,
// no write operations. See ARCHITECTURE.md for the full picture.

import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import marketsRouter from "./routes/markets.js";

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(cors());
app.use(express.json());

// Request logger (simple, no dependency on winston/morgan for v1)
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Health check — useful for uptime monitoring and deployment smoke tests
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "predict-me-backend",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
    contract: env.MARKET_CONTRACT_ID,
    network: env.SOROBAN_RPC_URL,
  });
});

// Market routes — GET /markets, GET /markets/:id
app.use("/markets", marketsRouter);

// 404 handler for any unmatched route
app.use((_req, res) => {
  res.status(404).json({
    error: "Route not found",
    code: "NOT_FOUND",
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(env.PORT, () => {
  console.log(`predict-me backend running on http://localhost:${env.PORT}`);
  console.log(`  Contract : ${env.MARKET_CONTRACT_ID}`);
  console.log(`  RPC URL  : ${env.SOROBAN_RPC_URL}`);
  console.log(`  Env      : ${env.NODE_ENV}`);
});

export default app;
