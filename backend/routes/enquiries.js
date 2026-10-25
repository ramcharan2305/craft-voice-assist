import { Router } from "express";

import { requireSupabase } from "../db.js";
import { requireArtisan } from "../middleware/auth.js";
import { toEnquiry } from "../services/mappers.js";

const router = Router();
const STATUS_VALUES = new Set(["in_progress", "responded", "closed"]);

router.get("/", requireArtisan, async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("enquiries")
      .select("*, products(name,image_url), artisans(name)")
      .eq("artisan_id", req.artisan.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return res.json(data.map(toEnquiry));
  } catch (error) {
    return next(error);
  }
});

router.put("/:id/status", requireArtisan, async (req, res, next) => {
  try {
    const status = typeof req.body?.status === "string" ? req.body.status.trim() : "";
    if (!STATUS_VALUES.has(status)) {
      return res.status(400).json({ error: "Choose in progress, responded, or closed." });
    }
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("enquiries")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .eq("artisan_id", req.artisan.id)
      .select("*, products(name,image_url), artisans(name)")
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "That enquiry was not found." });
    return res.json(toEnquiry(data));
  } catch (error) {
    return next(error);
  }
});

export default router;
