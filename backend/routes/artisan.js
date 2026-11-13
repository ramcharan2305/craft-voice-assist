import express, { Router } from "express";

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
      age:
        body.age === undefined
          ? undefined
          : body.age === null || body.age === ""
            ? null
            : Number(body.age),
      gender: typeof body.gender === "string" ? body.gender.trim() : undefined,
      state: typeof body.state === "string" ? body.state.trim() : undefined,
      district: typeof body.district === "string" ? body.district.trim() : undefined,
      city: typeof body.city === "string" ? body.city.trim() : undefined,
      product_category:
        typeof body.product_category === "string" ? body.product_category.trim() : undefined,
      business_size: typeof body.business_size === "string" ? body.business_size.trim() : undefined,
      experience_years:
        body.experience_years === undefined ||
        body.experience_years === null ||
        body.experience_years === ""
          ? undefined
          : Number(body.experience_years),
      payment_qr_url:
        typeof body.payment_qr_url === "string" ? body.payment_qr_url.trim() : undefined,
    };

    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      if (key === "experience_years" && !Number.isFinite(value)) {
        return res.status(400).json({ error: "Experience years must be a number." });
      }
      if (key === "age" && value === null) {
        return res.status(400).json({ error: "Age is required." });
      }
      if (key === "age" && (!Number.isInteger(value) || value < 1 || value > 120)) {
        return res.status(400).json({ error: "Age must be a whole number between 1 and 120." });
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

router.post(
  "/payment-qr",
  requireArtisan,
  express.raw({ type: "image/*", limit: "2mb" }),
  async (req, res, next) => {
    try {
      const contentType = req.get("content-type")?.split(";")[0].trim().toLowerCase();
      const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
      if (!Buffer.isBuffer(req.body) || !req.body.length || !allowedTypes.has(contentType)) {
        return res.status(400).json({ error: "Upload a PNG, JPG or WebP QR code image." });
      }
      if (req.body.length > 2 * 1024 * 1024) {
        return res.status(413).json({ error: "Keep the QR code under 2 MB." });
      }

      const signatures = {
        "image/png": req.body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
        "image/jpeg": req.body[0] === 0xff && req.body[1] === 0xd8 && req.body[2] === 0xff,
        "image/webp":
          req.body.subarray(0, 4).toString() === "RIFF" &&
          req.body.subarray(8, 12).toString() === "WEBP",
      };
      if (!signatures[contentType]) {
        return res.status(400).json({ error: "The selected file is not a valid image." });
      }

      const supabase = requireSupabase();
      const bucket = "merchant-qr";
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      if (bucketsError) throw bucketsError;
      if (!buckets.some((item) => item.name === bucket)) {
        const { error: createError } = await supabase.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: 2 * 1024 * 1024,
          allowedMimeTypes: [...allowedTypes],
        });
        if (createError) throw createError;
      }

      const path = `merchant/${req.artisan.id}/payment-qr`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, req.body, {
        upsert: true,
        contentType,
      });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      const paymentQrUrl = urlData.publicUrl;

      const { data, error } = await supabase
        .from("artisans")
        .update({ payment_qr_url: paymentQrUrl })
        .eq("id", req.artisan.id)
        .select("payment_qr_url")
        .single();

      if (error) throw error;
      return res.json({ payment_qr_url: data?.payment_qr_url ?? paymentQrUrl });
    } catch (error) {
      return next(error);
    }
  },
);

router.delete("/payment-qr", requireArtisan, async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    const existingQrUrl = req.artisan.payment_qr_url ?? "";
    const marker = `/storage/v1/object/public/merchant-qr/`;
    const markerIndex = existingQrUrl.indexOf(marker);
    if (markerIndex >= 0) {
      const path = decodeURIComponent(existingQrUrl.slice(markerIndex + marker.length));
      const { error: storageError } = await supabase.storage.from("merchant-qr").remove([path]);
      if (storageError) throw storageError;
    }
    const { data, error } = await supabase
      .from("artisans")
      .update({ payment_qr_url: "" })
      .eq("id", req.artisan.id)
      .select("payment_qr_url")
      .single();
    if (error) throw error;
    return res.json({ payment_qr_url: data?.payment_qr_url ?? "" });
  } catch (error) {
    return next(error);
  }
});

export default router;
