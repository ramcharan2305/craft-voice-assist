import { requireSupabase } from "../db.js";

/**
 * Resolves the artisan for each request.
 *
 * Resolves only the authenticated artisan. Ownership is never taken from the
 * request body, and unauthenticated requests are not assigned a demo account.
 */
async function resolveArtisan(supabase, token) {
  if (!token) return { artisan: null, user: null };
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return { artisan: null, user: null };
  if (data.user.app_metadata?.role && data.user.app_metadata.role !== "merchant") {
    return { artisan: null, user: data.user, forbidden: true };
  }
  const { data: row, error: artisanError } = await supabase
    .from("artisans")
    .select("*")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (artisanError) throw artisanError;
  return { artisan: row ?? null, user: data.user };
}

/** Requires an artisan. Fails with a setup hint when the database is empty. */
export async function requireArtisan(req, res, next) {
  try {
    const supabase = requireSupabase();
    const { artisan, user } = await resolveArtisan(supabase, bearerToken(req));

    if (!user) {
      return res
        .status(401)
        .json({ error: "Sign in as a merchant to continue.", code: "AUTH_REQUIRED" });
    }
    if (user.app_metadata?.role && user.app_metadata.role !== "merchant") {
      return res
        .status(403)
        .json({ error: "This page is for merchant accounts.", code: "ROLE_FORBIDDEN" });
    }
    if (!artisan) {
      return res
        .status(403)
        .json({ error: "No merchant profile is linked to this account.", code: "NO_ARTISAN" });
    }

    req.artisan = artisan;
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireRole(role) {
  return async (req, res, next) => {
    try {
      const supabase = requireSupabase();
      const token = bearerToken(req);
      if (!token) {
        return res.status(401).json({ error: "Sign in to continue.", code: "AUTH_REQUIRED" });
      }
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user) {
        return res
          .status(401)
          .json({ error: "Your session has expired. Sign in again.", code: "SESSION_EXPIRED" });
      }
      if (data.user.app_metadata?.role !== role) {
        return res
          .status(403)
          .json({ error: `This page is for ${role} accounts.`, code: "ROLE_FORBIDDEN" });
      }
      req.user = data.user;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

function bearerToken(req) {
  const header = req.headers.authorization ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}
