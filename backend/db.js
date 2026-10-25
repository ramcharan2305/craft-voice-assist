import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Server-side client that bypasses row level security. Never returned to the browser. */
export const supabaseAdmin = url && serviceRoleKey ? createClient(url, serviceRoleKey) : null;
/** Auth client for password sign-in. The publishable key is safe for client use. */
export const supabaseAuth = url && anonKey ? createClient(url, anonKey) : null;

/** True when Supabase credentials are present. */
export const supabaseConfigured = Boolean(url && serviceRoleKey);

/** Throws a clean 503 when the backend was started without Supabase credentials. */
export function requireSupabase() {
  if (!supabaseAdmin) {
    const error = new Error(
      "Supabase is not configured. Copy backend/.env.example to backend/.env and fill it in.",
    );
    error.status = 503;
    throw error;
  }
  return supabaseAdmin;
}
