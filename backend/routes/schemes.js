import { Router } from "express";

import { supabaseConfigured, requireSupabase } from "../db.js";
import { matches, REFERENCE_SCHEMES } from "../services/referenceData.js";

const router = Router();

const FIELDS = ["name", "description", "benefits", "eligibility"];

/**
 * GET /api/schemes?q=cotton
 *
 * Schemes always come from stored records, never from the assistant. When
 * Supabase has not been set up yet the bundled sample rows are served instead,
 * so the page still works.
 */
router.get("/", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim();

    if (!supabaseConfigured) {
      return res.json(REFERENCE_SCHEMES.filter((row) => matches(row, q, FIELDS)));
    }

    const supabase = requireSupabase();
    const { data, error } = await supabase.from("schemes").select("*").order("id", { ascending: true });
    if (error) throw error;
    res.json(q ? data.filter((row) => matches(row, q, FIELDS)) : data);
  } catch (error) {
    next(error);
  }
});

/** GET /api/schemes/:id */
router.get("/:id", async (req, res, next) => {
  try {
    if (!supabaseConfigured) {
      const found = REFERENCE_SCHEMES.find((row) => row.id === req.params.id);
      if (!found) return res.status(404).json({ error: "That scheme was not found." });
      return res.json(found);
    }

    const supabase = requireSupabase();
    const { data, error } = await supabase.from("schemes").select("*").eq("id", req.params.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "That scheme was not found." });
    res.json(data);
  } catch (error) {
    next(error);
  }
});

export default router;