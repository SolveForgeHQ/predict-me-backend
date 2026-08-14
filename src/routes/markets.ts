// routes/markets.ts
// Read-only market routes. No auth, no database, no write operations.
//
// GET /markets          — returns all markets from the contract
// GET /markets/:id      — returns a single market by its u32 id
//
// Both routes fall back gracefully when the contract is not yet deployed:
// GET /markets returns []
// GET /markets/:id returns 404

import { Router, Request, Response } from "express";
import {
  fetchAllMarkets,
  fetchMarketById,
  normaliseMarket,
} from "../services/stellar.js";
import type { ApiError } from "../types/market.js";

const router = Router();

// ---------------------------------------------------------------------------
// GET /markets
// ---------------------------------------------------------------------------

router.get("/", async (_req: Request, res: Response) => {
  try {
    const raw = await fetchAllMarkets();
    const markets = raw.map(normaliseMarket);

    res.json({
      markets,
      count: markets.length,
      // Callers can use this to detect mock vs live data
      source: markets.length === 0 ? "empty" : "contract",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[GET /markets]", message);

    const body: ApiError = {
      error: "Failed to fetch markets from contract",
      code: "CONTRACT_QUERY_FAILED",
    };
    res.status(502).json(body);
  }
});

// ---------------------------------------------------------------------------
// GET /markets/:id
// ---------------------------------------------------------------------------

router.get("/:id", async (req: Request, res: Response) => {
  const rawId = req.params.id;
  const marketId = parseInt(rawId, 10);

  if (isNaN(marketId) || marketId < 0) {
    const body: ApiError = {
      error: `Invalid market id: "${rawId}". Must be a non-negative integer.`,
      code: "INVALID_MARKET_ID",
    };
    res.status(400).json(body);
    return;
  }

  try {
    const raw = await fetchMarketById(marketId);

    if (!raw) {
      const body: ApiError = {
        error: `Market ${marketId} not found`,
        code: "MARKET_NOT_FOUND",
      };
      res.status(404).json(body);
      return;
    }

    res.json(normaliseMarket(raw));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[GET /markets/${marketId}]`, message);

    const body: ApiError = {
      error: "Failed to fetch market from contract",
      code: "CONTRACT_QUERY_FAILED",
    };
    res.status(502).json(body);
  }
});

export default router;
