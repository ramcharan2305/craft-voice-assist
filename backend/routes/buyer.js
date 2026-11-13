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
    const [enquiries, orders] = await Promise.all([
      supabase
        .from("enquiries")
        .select("*, products(name,image_url), artisans(name)")
        .eq("buyer_id", req.user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select("*, products(name,image_url), artisans(name, payment_qr_url)")
        .eq("buyer_id", req.user.id)
        .order("created_at", { ascending: false }),
    ]);
    if (enquiries.error) throw enquiries.error;
    if (orders.error) throw orders.error;
    const purchases = (orders.data ?? []).map((row) => ({
      ...toEnquiry({
        ...row,
        request_type: "purchase",
        status: row.payment_status === "verified" ? "completed" : "pending",
      }),
      amount: Number(row.amount ?? 0),
      payment_status: row.payment_status ?? "pending",
      payment_utr: row.payment_utr ?? "",
      payment_screenshot: row.payment_screenshot ?? "",
      merchant_qr_url: row.artisans?.payment_qr_url ?? "",
    }));
    return res.json(
      [...(enquiries.data ?? []).map(toEnquiry), ...purchases].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    );
  } catch (error) {
    return next(error);
  }
});

router.post("/purchases", async (req, res, next) => {
  try {
    const productId = typeof req.body?.product_id === "string" ? req.body.product_id.trim() : "";
    const quantity = req.body?.quantity === undefined ? 1 : Number(req.body.quantity);
    if (!productId) return res.status(400).json({ error: "Choose a product to buy." });
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: "Quantity must be a whole number greater than zero." });
    }

    const supabase = requireSupabase();
    const { data: product, error: productError } = await supabase
      .from("products")
      .select(
        "id, name, image_url, price, quantity, artisan_id, artisans!inner(name, payment_qr_url, verification_status)",
      )
      .eq("id", productId)
      .eq("status", "listed")
      .in("review_status", ["pending", "approved"])
      .in("artisans.verification_status", ["pending", "approved"])
      .maybeSingle();

    if (productError) throw productError;
    if (!product) {
      return res.status(404).json({ error: "This product is no longer available." });
    }
    if (product.quantity < quantity) {
      return res.status(409).json({
        error: `Only ${product.quantity} piece${product.quantity === 1 ? "" : "s"} are available.`,
      });
    }

    const buyerName =
      (typeof req.user.user_metadata?.name === "string" && req.user.user_metadata.name.trim()) ||
      req.user.email?.split("@")[0] ||
      "Buyer";

    const existingActiveOrder = await supabase
      .from("orders")
      .select("id")
      .eq("buyer_id", req.user.id)
      .eq("product_id", productId)
      .in("payment_status", ["pending", "submitted", "verified", "rejected"])
      .limit(1)
      .maybeSingle();

    if (existingActiveOrder.error) throw existingActiveOrder.error;
    if (existingActiveOrder.data) {
      return res.status(409).json({
        error: "You already have an order for this product awaiting payment or verification.",
      });
    }

    const amount = Number(product.price ?? 0) * quantity;
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        artisan_id: product.artisan_id,
        product_id: productId,
        buyer_id: req.user.id,
        buyer_name: buyerName.slice(0, 120),
        quantity,
        amount,
        status: "pending",
        payment_status: "pending",
        payment_utr: "",
        payment_screenshot: "",
      })
      .select("*, products(name,image_url), artisans(name, payment_qr_url)")
      .single();

    if (orderError) throw orderError;

    return res.status(201).json({
      id: order.id,
      buyer_name: order.buyer_name,
      product_id: order.product_id,
      product_name: order.products?.name ?? product.name,
      product_image: order.products?.image_url ?? product.image_url ?? "",
      artisan_id: order.artisan_id,
      artisan_name: order.artisans?.name ?? "",
      merchant_qr_url: order.artisans?.payment_qr_url ?? product.artisans?.payment_qr_url ?? "",
      request_type: "purchase",
      quantity: Number(order.quantity),
      amount: Number(order.amount),
      message: "Payment details are required before the order can be confirmed.",
      status: "pending",
      payment_status: order.payment_status ?? "pending",
      created_at: order.created_at,
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/orders/:id/payment", async (req, res, next) => {
  try {
    const utr = typeof req.body?.utr === "string" ? req.body.utr.trim() : "";
    const screenshot = typeof req.body?.screenshot === "string" ? req.body.screenshot.trim() : "";

    if (!utr || !/^[A-Za-z0-9]{6,}$/i.test(utr)) {
      return res.status(400).json({ error: "Enter a valid UTR or UPI transaction ID." });
    }
    if (!screenshot || !/^data:image\/(jpeg|png|webp);base64,/i.test(screenshot)) {
      return res.status(400).json({ error: "Upload a payment screenshot before submitting." });
    }

    const supabase = requireSupabase();
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("*, products(name,image_url), artisans(name, payment_qr_url)")
      .eq("id", req.params.id)
      .eq("buyer_id", req.user.id)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!order) {
      return res.status(404).json({ error: "That payment request was not found." });
    }
    if (!order.artisans?.payment_qr_url) {
      return res
        .status(400)
        .json({ error: "This merchant has not uploaded a payment QR code yet." });
    }
    if (["verified", "submitted"].includes(order.payment_status)) {
      return res.status(409).json({ error: "This payment has already been submitted for review." });
    }

    const { data, error } = await supabase
      .from("orders")
      .update({
        payment_status: "submitted",
        payment_utr: utr.slice(0, 120),
        payment_screenshot: screenshot,
        status: "pending",
      })
      .eq("id", order.id)
      .select("*, products(name,image_url), artisans(name, payment_qr_url)")
      .single();
    if (error) throw error;

    return res.json({
      ...toEnquiry({
        ...data,
        request_type: "purchase",
        status: data.payment_status === "verified" ? "completed" : "pending",
      }),
      product_name: data.products?.name ?? "Product",
      amount: Number(data.amount ?? 0),
      merchant_qr_url: data.artisans?.payment_qr_url ?? "",
      payment_status: data.payment_status,
      payment_utr: data.payment_utr,
      payment_screenshot: data.payment_screenshot,
    });
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

    if (!["question", "service"].includes(requestType)) {
      return res.status(400).json({ error: "Choose a product question or service request." });
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ error: "Quantity must be a whole number greater than zero." });
    }
    if (!message) {
      return res.status(400).json({ error: "Add a message to your question or service request." });
    }

    const supabase = requireSupabase();
    let targetArtisanId = artisanId;
    let requestProductId = null;
    const buyerName =
      (typeof req.user.user_metadata?.name === "string" && req.user.user_metadata.name.trim()) ||
      req.user.email?.split("@")[0] ||
      "Buyer";

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
        .in("review_status", ["pending", "approved"])
        .in("artisans.verification_status", ["pending", "approved"])
        .maybeSingle();
      if (productError) throw productError;
      if (!product)
        return res.status(404).json({ error: "This listed product is no longer available." });
      targetArtisanId = product.artisan_id;
      requestProductId = product.id;
    }

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
