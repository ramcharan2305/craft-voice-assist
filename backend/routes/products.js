import { Router } from "express";

import { requireSupabase } from "../db.js";
import { requireArtisan } from "../middleware/auth.js";
import { toProduct } from "../services/mappers.js";

const router = Router();

const asNumber = (value, field) => {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    const error = new Error(`${field} must be a positive number.`);
    error.status = 400;
    throw error;
  }
  return n;
};

const asQuantity = (value) => {
  const quantity = asNumber(value, "Quantity");
  if (quantity !== null && !Number.isInteger(quantity)) {
    const error = new Error("Quantity must be a whole number.");
    error.status = 400;
    throw error;
  }
  return quantity;
};

const asText = (value) => (typeof value === "string" && value.trim() !== "" ? value.trim() : null);

const asImage = (value) => {
  const image = asText(value);
  if (image && image.length > 1_800_000) {
    const error = new Error("This product photo is too large. Choose a smaller image.");
    error.status = 413;
    throw error;
  }
  return image;
};

function readBody(body) {
  const status = asText(body.status);
  if (status && !["listed", "draft", "sold"].includes(status)) {
    const error = new Error("Unknown product status.");
    error.status = 400;
    throw error;
  }
  return {
    name: asText(body.name)?.slice(0, 120) ?? null,
    description: asText(body.description)?.slice(0, 3000) ?? null,
    category: asText(body.category)?.slice(0, 80) ?? null,
    craft: asText(body.craft)?.slice(0, 100) ?? null,
    material: asText(body.material)?.slice(0, 160) ?? null,
    color: asText(body.color)?.slice(0, 80) ?? null,
    price: asNumber(body.price, "Price"),
    quantity: asQuantity(body.quantity),
    image_url: asImage(body.image_url),
    status,
  };
}

/** GET /api/products/catalog — only approved, available listings are public. */
router.get("/catalog", async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    const rawQuery = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 120) : "";
    const priceMatch = rawQuery.match(
      /(?:under|below|less than)\s*(?:₹|rs\.?)?\s*([\d,]+)|(?:₹|rs\.?)\s*([\d,]+)/i,
    );
    const rawMaxPrice = priceMatch?.[1] ?? priceMatch?.[2];
    const maxPrice =
      req.query.max_price === undefined
        ? rawMaxPrice
          ? Number(rawMaxPrice.replace(/,/g, ""))
          : null
        : Number(req.query.max_price);
    const query = rawQuery
      .replace(/(?:under|below|less than)\s*(?:₹|rs\.?)?\s*[\d,]+|(?:₹|rs\.?)\s*[\d,]+/gi, " ")
      .replace(
        /\b(find|search|show|me|look|for|browse|tell|about|details|describe|this|product|products|please|rupees?|rs)\b/gi,
        " ",
      )
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100);
    const category =
      typeof req.query.category === "string" ? req.query.category.trim().slice(0, 80) : "";
    if (maxPrice !== null && (!Number.isFinite(maxPrice) || maxPrice < 0)) {
      return res.status(400).json({ error: "Maximum price must be a non-negative number." });
    }

    let request = supabase
      .from("products")
      .select("*, artisans!inner(name, location, craft_type, verification_status)")
      .eq("review_status", "approved")
      .eq("status", "listed")
      .gt("quantity", 0)
      .eq("artisans.verification_status", "approved")
      .order("created_at", { ascending: false });
    if (category) request = request.eq("category", category);
    if (maxPrice !== null) request = request.lte("price", maxPrice);
    request = request.limit(200);

    const { data, error } = await request;
    if (error) throw error;
    const terms = query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) =>
        word.endsWith("ies")
          ? `${word.slice(0, -3)}y`
          : word.endsWith("s")
            ? word.slice(0, -1)
            : word,
      );
    return res.json(
      data
        .filter((row) => {
          const haystack =
            `${row.name} ${row.description} ${row.category} ${row.material} ${row.craft}`.toLowerCase();
          return !terms.length || terms.every((term) => haystack.includes(term));
        })
        .map(toProduct),
    );
  } catch (error) {
    return next(error);
  }
});

/** GET /api/products — only the signed-in artisan's products. */
router.get("/", requireArtisan, async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("artisan_id", req.artisan.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data.map(toProduct));
  } catch (error) {
    next(error);
  }
});

/** GET /api/products/:id — only returns products owned by the resolved artisan. */
router.get("/:id", requireArtisan, async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", req.params.id)
      .eq("artisan_id", req.artisan.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: "That product was not found." });
    res.json(toProduct(data));
  } catch (error) {
    next(error);
  }
});

/** POST /api/products */
router.post("/", requireArtisan, async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    const fields = readBody(req.body ?? {});

    if (!fields.name) return res.status(400).json({ error: "Please give the product a name." });
    if (fields.price === null || fields.price <= 0)
      return res.status(400).json({ error: "Please give a price greater than zero." });
    if (fields.quantity !== null && fields.quantity < 0)
      return res.status(400).json({ error: "Quantity cannot be negative." });
    if (
      fields.image_url &&
      !/^(https?:\/\/|data:image\/(?:jpeg|png|webp);base64,)/i.test(fields.image_url)
    ) {
      return res.status(400).json({ error: "Use an image URL or JPEG, PNG, or WebP image." });
    }

    const { data, error } = await supabase
      .from("products")
      .insert({
        artisan_id: req.artisan.id,
        name: fields.name,
        description: fields.description ?? "",
        category: fields.category ?? "Craft",
        craft: fields.craft ?? fields.category ?? "Handmade",
        material: fields.material ?? "Handmade materials",
        color: fields.color ?? "Natural",
        price: fields.price,
        quantity: fields.quantity ?? 1,
        image_url: fields.image_url ?? "",
        status: fields.status ?? "listed",
        review_status: "pending",
        review_feedback: "",
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(toProduct(data));
  } catch (error) {
    next(error);
  }
});

/** PUT /api/products/:id — ownership is checked against the artisan, never a client-supplied id. */
router.put("/:id", requireArtisan, async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    const fields = readBody(req.body ?? {});
    const patch = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== null));
    patch.updated_at = new Date().toISOString();
    if (fields.price !== null && fields.price <= 0)
      return res.status(400).json({ error: "Price must be greater than zero." });
    if (fields.quantity !== null && fields.quantity < 0)
      return res.status(400).json({ error: "Quantity cannot be negative." });
    if (
      fields.image_url &&
      !/^(https?:\/\/|data:image\/(?:jpeg|png|webp);base64,)/i.test(fields.image_url)
    ) {
      return res.status(400).json({ error: "Use an image URL or JPEG, PNG, or WebP image." });
    }
    if (Object.keys(patch).some((field) => !["updated_at", "status"].includes(field))) {
      patch.review_status = "pending";
      patch.review_feedback = "";
      patch.review_reviewed_at = null;
      patch.review_reviewed_by = null;
    }

    const { data, error } = await supabase
      .from("products")
      .update(patch)
      .eq("id", req.params.id)
      .eq("artisan_id", req.artisan.id)
      .select()
      .single();

    if (error) throw error;
    res.json(toProduct(data));
  } catch (error) {
    if (error.code === "PGRST116") {
      return res.status(404).json({ error: "That product was not found." });
    }
    next(error);
  }
});

/** DELETE /api/products/:id */
router.delete("/:id", requireArtisan, async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("products")
      .delete()
      .eq("id", req.params.id)
      .eq("artisan_id", req.artisan.id)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "That product was not found." });
    res.json({ success: true, id: data.id });
  } catch (error) {
    next(error);
  }
});

export default router;
export { toProduct };
