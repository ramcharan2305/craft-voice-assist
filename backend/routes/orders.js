import { Router } from "express";

import { requireSupabase } from "../db.js";
import { requireArtisan } from "../middleware/auth.js";
import { toOrder } from "../services/mappers.js";

const router = Router();

/** GET /api/orders */
router.get("/", requireArtisan, async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("orders")
      .select("*, products(name)")
      .eq("artisan_id", req.artisan.id)
      .order("created_at", { ascending: false });
    if (error) throw error;

    res.json(
      data.map((row) => ({
        ...toOrder(row, row.products?.name),
        product_name: row.products?.name ?? "Product",
      })),
    );
  } catch (error) {
    next(error);
  }
});

/** PUT /api/orders/:id/status */
router.put("/:id/status", requireArtisan, async (req, res, next) => {
  try {
    const status = String(req.body?.status ?? "").trim().toLowerCase();
    const allowed = ["pending", "confirmed", "shipped", "completed", "cancelled"];
    if (!allowed.includes(status)) return res.status(400).json({ error: "Unknown order status." });

    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", req.params.id)
      .eq("artisan_id", req.artisan.id)
      .select("*, products(name)")
      .single();
    if (error) throw error;

    res.json({ ...toOrder(data, data.products?.name), product_name: data.products?.name ?? "Product" });
  } catch (error) {
    if (error.code === "PGRST116") return res.status(404).json({ error: "That order was not found." });
    next(error);
  }
});

export default router;