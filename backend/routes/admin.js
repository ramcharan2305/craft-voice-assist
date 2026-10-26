import { Router } from "express";

import { requireSupabase } from "../db.js";
import { requireRole } from "../middleware/auth.js";
import { toArtisan, toProduct } from "../services/mappers.js";

const router = Router();
router.use(requireRole("admin"));

function reviewInput(body) {
  const action = typeof body?.action === "string" ? body.action.trim() : "";
  const feedback = typeof body?.feedback === "string" ? body.feedback.trim().slice(0, 1000) : "";
  if (!["approve", "reject", "corrections"].includes(action)) {
    const error = new Error("Choose approve, reject, or corrections.");
    error.status = 400;
    throw error;
  }
  if (action !== "approve" && !feedback) {
    const error = new Error("Add feedback when rejecting or requesting corrections.");
    error.status = 400;
    throw error;
  }
  return {
    status:
      action === "approve" ? "approved" : action === "reject" ? "rejected" : "changes_requested",
    feedback,
  };
}

router.get("/summary", async (_req, res, next) => {
  try {
    const supabase = requireSupabase();
    const count = (table, apply = (query) => query) =>
      apply(supabase.from(table).select("id", { count: "exact", head: true }));
    const [artisans, pendingArtisans, products, pendingProducts] = await Promise.all([
      count("artisans"),
      count("artisans", (query) => query.eq("verification_status", "pending")),
      count("products", (query) => query.eq("review_status", "approved")),
      count("products", (query) => query.eq("review_status", "pending")),
    ]);
    for (const result of [artisans, pendingArtisans, products, pendingProducts]) {
      if (result.error) throw result.error;
    }
    return res.json({
      artisans: artisans.count ?? 0,
      pendingArtisans: pendingArtisans.count ?? 0,
      approvedProducts: products.count ?? 0,
      pendingProducts: pendingProducts.count ?? 0,
    });
  } catch (error) {
    return next(error);
  }
});

router.get("/artisans", async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const supabase = requireSupabase();
    let query = supabase.from("artisans").select("*").order("created_at", { ascending: false });
    if (status) query = query.eq("verification_status", status);
    const { data, error } = await query;
    if (error) throw error;
    return res.json(data.map(toArtisan));
  } catch (error) {
    return next(error);
  }
});

router.put("/artisans/:id/review", async (req, res, next) => {
  try {
    const review = reviewInput(req.body);
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("artisans")
      .update({
        verification_status: review.status,
        verification_feedback: review.feedback,
        verification_reviewed_at: new Date().toISOString(),
        verification_reviewed_by: req.user.id,
      })
      .eq("id", req.params.id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "That artisan was not found." });
    return res.json(toArtisan(data));
  } catch (error) {
    return next(error);
  }
});

router.get("/products", async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const supabase = requireSupabase();
    let query = supabase
      .from("products")
      .select("*, artisans!inner(name, location, craft_type)")
      .order("created_at", { ascending: false });
    if (status) query = query.eq("review_status", status);
    const { data, error } = await query;
    if (error) throw error;
    return res.json(data.map(toProduct));
  } catch (error) {
    return next(error);
  }
});

router.put("/products/:id/review", async (req, res, next) => {
  try {
    const review = reviewInput(req.body);
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("products")
      .update({
        review_status: review.status,
        review_feedback: review.feedback,
        review_reviewed_at: new Date().toISOString(),
        review_reviewed_by: req.user.id,
      })
      .eq("id", req.params.id)
      .select("*, artisans(name, location, craft_type)")
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "That product was not found." });
    return res.json(toProduct(data));
  } catch (error) {
    return next(error);
  }
});

router.delete("/products/:id", async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("products")
      .delete()
      .eq("id", req.params.id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "That product was not found." });
    return res.json({ success: true, id: data.id });
  } catch (error) {
    return next(error);
  }
});

export default router;
