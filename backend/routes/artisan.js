import { Router } from "express";

import { requireSupabase } from "../db.js";
import { requireArtisan } from "../middleware/auth.js";
import { toArtisan } from "../services/mappers.js";

const router = Router();

/** GET /api/artisan/profile */
router.get("/profile", requireArtisan, async (req, res, next) => {
  try {
    res.json(toArtisan(req.artisan));
  } catch (error) {
    next(error);
  }
});

/** PUT /api/artisan/profile */
router.put("/profile", requireArtisan, async (req, res, next) => {
  try {
    const body = req.body ?? {};
    const patch = {
      name: typeof body.name === "string" ? body.name.trim() : undefined,
      phone: typeof body.phone === "string" ? body.phone.trim() : undefined,
      language: typeof body.language === "string" ? body.language.trim() : undefined,
      location: typeof body.location === "string" ? body.location.trim() : undefined,
      craft_type: typeof body.craft_type === "string" ? body.craft_type.trim() : undefined,
      experience_years:
        body.experience_years === undefined || body.experience_years === null || body.experience_years === ""
          ? undefined
          : Number(body.experience_years),
    };

    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      if (key === "experience_years" && !Number.isFinite(value)) {
        return res.status(400).json({ error: "Experience years must be a number." });
      }
    }

    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("artisans")
      .update(Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)))
      .eq("id", req.artisan.id)
      .select()
      .single();

    if (error) throw error;
    res.json(toArtisan(data));
  } catch (error) {
    next(error);
  }
});

export default router;