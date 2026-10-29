import { Router } from "express";

import { requireSupabase } from "../db.js";

const router = Router();

const VALID_ROLES = new Set(["merchant", "buyer"]);

/**
 * POST /api/onboarding/role
 *
 * Body: { role: "merchant" | "buyer" }
 *
 * The role is chosen on the client, but it is persisted here, on the server,
 * against the authenticated Supabase user. The frontend never writes a role
 * directly to the database or to user metadata.
 */
router.post("/role", async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) return res.status(401).json({ error: "Please sign in first.", code: "NO_SESSION" });

    const { data, error: userError } = await supabase.auth.getUser(token);
    if (userError || !data?.user) {
      return res.status(401).json({ error: "Your session has expired. Please sign in again.", code: "NO_SESSION" });
    }
    const user = data.user;

    const role = String(req.body?.role ?? "").trim().toLowerCase();
    if (!VALID_ROLES.has(role)) {
      return res.status(400).json({ error: "Please choose Buyer or Merchant." });
    }

    // Upsert the artisan profile with the chosen role.
    const name = user.user_metadata?.name || user.user_metadata?.full_name || String(user.email ?? "Artisan").split("@")[0];
    const { data: existing } = await supabase.from("artisans").select("id").eq("user_id", user.id).maybeSingle();

    let artisan;
    if (existing) {
      const { data: updated, error } = await supabase
        .from("artisans")
        .update({ role, name })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      artisan = updated;
    } else {
      const { data: created, error } = await supabase
        .from("artisans")
        .insert({ user_id: user.id, name, role, is_demo: false })
        .select()
        .single();
      if (error) throw error;
      artisan = created;
    }

    // Mirror the role into the auth user's metadata so it travels with the session.
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: { ...(user.user_metadata ?? {}), role },
    });

    res.json({ role, artisan });
  } catch (error) {
    next(error);
  }
});

/** GET /api/onboarding/status — tells the frontend whether onboarding is done. */
router.get("/status", async (req, res, next) => {
  try {
    const supabase = requireSupabase();
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) return res.json({ authenticated: false, role: null });

    const { data } = await supabase.auth.getUser(token);
    if (!data?.user) return res.json({ authenticated: false, role: null });

    const { data: artisan } = await supabase
      .from("artisans")
      .select("role")
      .eq("user_id", data.user.id)
      .maybeSingle();

    const role = artisan?.role ?? data.user.user_metadata?.role ?? null;
    res.json({ authenticated: true, role });
  } catch (error) {
    next(error);
  }
});

export default router;