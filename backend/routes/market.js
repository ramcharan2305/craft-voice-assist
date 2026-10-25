import { Router } from "express";

import { supabaseConfigured, requireSupabase } from "../db.js";
import { matches, REFERENCE_MARKET } from "../services/referenceData.js";

const router = Router();

const FIELDS = ["product_category", "region"];
const NOTE = "Sample market figures for the demo, not a live feed.";

/**
 * GET /api/market  (also mounted at /api/market-insights)
 *
 * Every response is flagged as sample data so the UI can label it honestly.
 */
router.get("/", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim();

    if (!supabaseConfigured) {
      return res.json({ isDemo: true, note: NOTE, items: REFERENCE_MARKET.filter((row) => matches(row, q, FIELDS)) });
    }

    const supabase = requireSupabase();
    const { data, error } = await supabase.from("market_insights").select("*").order("id", { ascending: true });
    if (error) throw error;
    res.json({ isDemo: true, note: NOTE, items: q ? data.filter((row) => matches(row, q, FIELDS)) : data });
  } catch (error) {
    next(error);
  }
});

export default router;