import { Router } from "express";

import { supabaseConfigured, requireSupabase } from "../db.js";
import { matches, REFERENCE_TRAINING } from "../services/referenceData.js";

const router = Router();

const FIELDS = ["title", "description", "category"];

/** GET /api/training?q=selling */
router.get("/", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim();

    if (!supabaseConfigured) {
      return res.json(REFERENCE_TRAINING.filter((row) => matches(row, q, FIELDS)));
    }

    const supabase = requireSupabase();
    const { data, error } = await supabase.from("training_resources").select("*").order("id", { ascending: true });
    if (error) throw error;
    res.json(q ? data.filter((row) => matches(row, q, FIELDS)) : data);
  } catch (error) {
    next(error);
  }
});

export default router;