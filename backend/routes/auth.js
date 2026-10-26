import { Router } from "express";

import { supabaseAdmin, supabaseAuth, requireSupabase } from "../db.js";

const router = Router();
const ROLES = new Set(["merchant", "buyer", "admin"]);

router.post("/login", async (req, res, next) => {
  try {
    if (!supabaseAuth) {
      return res
        .status(503)
        .json({ error: "Supabase Auth is not configured.", code: "AUTH_NOT_CONFIGURED" });
    }
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password ?? "");
    if (!email || !password)
      return res.status(400).json({ error: "Enter your email and password." });

    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user) {
      return res
        .status(401)
        .json({ error: "Email or password is incorrect.", code: "INVALID_CREDENTIALS" });
    }

    const role = await resolveRole(data.user);
    if (!role) {
      await supabaseAuth.auth.signOut();
      return res.status(403).json({
        error: "This account does not have an H Connect role.",
        code: "ROLE_NOT_ASSIGNED",
      });
    }
    return res.json({ ...sessionResponse(data.session), user: publicUser(data.user, role) });
  } catch (error) {
    return next(error);
  }
});

router.post("/google/complete", async (req, res, next) => {
  try {
    const token = bearerToken(req);
    if (!token) {
      return res
        .status(401)
        .json({ error: "Complete Google sign-in first.", code: "AUTH_REQUIRED" });
    }

    const requestedRole = typeof req.body?.role === "string" ? req.body.role.trim() : "";
    if (!["buyer", "merchant"].includes(requestedRole)) {
      return res.status(400).json({ error: "Choose a buyer or merchant account." });
    }

    const supabase = requireSupabase();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res
        .status(401)
        .json({ error: "Your Google session is invalid or expired.", code: "SESSION_EXPIRED" });
    }

    let user = data.user;
    const googleIdentity =
      user.app_metadata?.providers?.includes("google") ||
      user.identities?.some((identity) => identity.provider === "google");
    if (!googleIdentity) {
      return res.status(403).json({
        error: "Continue with a Google account to create a workspace.",
        code: "GOOGLE_REQUIRED",
      });
    }

    let role = await resolveRole(user);
    if (!role) {
      const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { app_metadata: { ...user.app_metadata, role: requestedRole } },
      );
      if (updateError) throw updateError;
      user = updated.user;
      role = requestedRole;
    }

    if (role === "merchant") await ensureMerchantProfile(supabase, user);
    return res.json({ user: publicUser(user, role) });
  } catch (error) {
    return next(error);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    if (!supabaseAuth) {
      return res
        .status(503)
        .json({ error: "Supabase Auth is not configured.", code: "AUTH_NOT_CONFIGURED" });
    }
    const refreshToken = String(req.body?.refresh_token ?? "");
    if (!refreshToken) return res.status(400).json({ error: "A refresh token is required." });
    const { data, error } = await supabaseAuth.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session || !data.user) {
      return res
        .status(401)
        .json({ error: "Your session has expired. Sign in again.", code: "SESSION_EXPIRED" });
    }
    const role = await resolveRole(data.user);
    if (!role)
      return res.status(403).json({
        error: "This account does not have an H Connect role.",
        code: "ROLE_NOT_ASSIGNED",
      });
    return res.json({ ...sessionResponse(data.session), user: publicUser(data.user, role) });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    const token = bearerToken(req);
    if (!token)
      return res.status(401).json({ error: "Sign in to continue.", code: "AUTH_REQUIRED" });
    const supabase = requireSupabase();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user)
      return res.status(401).json({ error: "Your session has expired.", code: "SESSION_EXPIRED" });
    const { error: signOutError } = await supabase.auth.admin.signOut(token, "global");
    if (signOutError) throw signOutError;
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

router.get("/me", async (req, res, next) => {
  try {
    const token = bearerToken(req);
    if (!token)
      return res.status(401).json({ error: "Sign in to continue.", code: "AUTH_REQUIRED" });
    const supabase = requireSupabase();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user)
      return res
        .status(401)
        .json({ error: "Your session has expired. Sign in again.", code: "SESSION_EXPIRED" });
    const role = await resolveRole(data.user);
    if (!role)
      return res.status(403).json({
        error: "This account does not have an H Connect role.",
        code: "ROLE_NOT_ASSIGNED",
      });
    return res.json({ user: publicUser(data.user, role) });
  } catch (error) {
    return next(error);
  }
});

async function resolveRole(user) {
  const assigned = user.app_metadata?.role;
  if (typeof assigned === "string" && ROLES.has(assigned)) return assigned;
  const supabase = supabaseAdmin ?? requireSupabase();
  const { data, error } = await supabase
    .from("artisans")
    .select("name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data ? "merchant" : null;
}

async function ensureMerchantProfile(supabase, user) {
  const { data: existing, error: lookupError } = await supabase
    .from("artisans")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return;

  const name =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "New artisan";
  const { error } = await supabase.from("artisans").insert({
    user_id: user.id,
    name: String(name).trim().slice(0, 120),
    verification_status: "pending",
  });
  if (error) throw error;
}

function publicUser(user, role) {
  return {
    id: user.id,
    email: user.email ?? "",
    role,
    name:
      user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split("@")[0] ?? "",
  };
}

function sessionResponse(session) {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at ?? null,
  };
}

function bearerToken(req) {
  const header = req.headers.authorization ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

export default router;
