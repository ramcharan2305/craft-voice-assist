import { Router } from "express";

import { requireSupabase } from "../db.js";
import { requireRole } from "../middleware/auth.js";
import { toArtisan, toProduct } from "../services/mappers.js";
import { isExpired, startOpportunityCrawl } from "../services/opportunities.js";

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

router.get("/opportunities/status", async (_req, res, next) => {
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("opportunity_crawl_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

router.get("/opportunities", async (_req, res, next) => {
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("opportunities")
      .select("*")
      .eq("is_removed", false)
      .order("last_checked_at", { ascending: false });
    if (error) throw error;
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

router.post("/opportunities/crawl", async (_req, res, next) => {
  try {
    const run = await startOpportunityCrawl(requireSupabase());
    return res.status(202).json(run);
  } catch (error) {
    return next(error);
  }
});

router.put("/opportunities/:id/review", async (req, res, next) => {
  try {
    const status = req.body?.status;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ error: "Choose approved or rejected." });
    }
    const supabase = requireSupabase();
    const { data: current, error: lookupError } = await supabase
      .from("opportunities")
      .select("id, deadline, event_date, is_removed")
      .eq("id", req.params.id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!current || current.is_removed) {
      return res.status(404).json({ error: "That opportunity was not found." });
    }
    const verifiedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("opportunities")
      .update({
        review_status: status,
        status:
          status === "approved"
            ? isExpired(current.deadline, current.event_date)
              ? "expired"
              : "active"
            : "unverified",
        last_verified_at: status === "approved" ? verifiedAt : null,
        updated_at: verifiedAt,
      })
      .eq("id", req.params.id)
      .eq("is_removed", false)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "That opportunity was not found." });
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

router.delete("/opportunities/:id", async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("opportunities")
      .update({ is_removed: true, review_status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "That opportunity was not found." });
    return res.json({ success: true, id: data.id });
  } catch (error) {
    return next(error);
  }
});

export default router;
