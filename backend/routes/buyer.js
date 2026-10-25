import { Router } from "express";

import { requireSupabase } from "../db.js";
import { requireRole } from "../middleware/auth.js";
import { toEnquiry } from "../services/mappers.js";

const router = Router();
router.use(requireRole("buyer"));

router.get("/artisans", async (_req, res, next) => {
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("artisans")
      .select("id,name,location,craft_type")
      .eq("verification_status", "approved")
      .order("name", { ascending: true });
    if (error) throw error;
    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

router.get("/requests", async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("enquiries")
      .select("*, products(name,image_url), artisans(name)")
      .eq("buyer_id", req.user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return res.json(data.map(toEnquiry));
  } catch (error) {
    return next(error);
  }
});

router.post("/requests", async (req, res, next) => {
  try {
    const productId = typeof req.body?.product_id === "string" ? req.body.product_id.trim() : "";
    const artisanId = typeof req.body?.artisan_id === "string" ? req.body.artisan_id.trim() : "";
    const requestType =
      typeof req.body?.request_type === "string" ? req.body.request_type.trim() : "";
    const message =
      typeof req.body?.message === "string" ? req.body.message.trim().slice(0, 2000) : "";
    const quantity = req.body?.quantity === undefined ? 1 : Number(req.body.quantity);

    if (!["purchase", "question", "service"].includes(requestType)) {
      return res
        .status(400)
        .json({ error: "Choose a purchase request, product question, or service request." });
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: "Quantity must be a whole number greater than zero." });
    }
    if (requestType !== "purchase" && !message) {
      return res.status(400).json({ error: "Add a message to your question or service request." });
    }

    const supabase = requireSupabase();
    let targetArtisanId = artisanId;
    let requestProductId = null;
    if (requestType === "service") {
      if (!artisanId)
        return res.status(400).json({ error: "Choose an artisan for your service request." });
      const { data: artisan, error: artisanError } = await supabase
        .from("artisans")
        .select("id")
        .eq("id", artisanId)
        .eq("verification_status", "approved")
        .maybeSingle();
      if (artisanError) throw artisanError;
      if (!artisan)
        return res.status(404).json({ error: "That verified artisan is not available." });
    } else {
      if (!productId) return res.status(400).json({ error: "Choose a product for your request." });
      const { data: product, error: productError } = await supabase
        .from("products")
        .select(
          "id, artisan_id, name, price, quantity, status, review_status, artisans!inner(name, verification_status)",
        )
        .eq("id", productId)
        .eq("status", "listed")
        .eq("review_status", "approved")
        .eq("artisans.verification_status", "approved")
        .maybeSingle();
      if (productError) throw productError;
      if (!product)
        return res.status(404).json({ error: "This approved product is no longer available." });
      if (requestType === "purchase" && quantity > Number(product.quantity)) {
        return res.status(400).json({
          error: `Only ${product.quantity} piece${product.quantity === 1 ? "" : "s"} are available.`,
        });
      }
      targetArtisanId = product.artisan_id;
      requestProductId = product.id;
    }

    const buyerName =
      (typeof req.user.user_metadata?.name === "string" && req.user.user_metadata.name.trim()) ||
      req.user.email?.split("@")[0] ||
      "Buyer";
    const { data, error } = await supabase
      .from("enquiries")
      .insert({
        buyer_id: req.user.id,
        buyer_name: buyerName.slice(0, 120),
        buyer_email: (req.user.email ?? "").slice(0, 254),
        artisan_id: targetArtisanId,
        product_id: requestProductId,
        request_type: requestType,
        quantity,
        message,
        status: "new",
      })
      .select("*, products(name,image_url), artisans(name)")
      .single();
    if (error) throw error;
    return res.status(201).json(toEnquiry(data));
  } catch (error) {
    return next(error);
  }
});

export default router;
