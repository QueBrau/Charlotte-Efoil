import { createClient } from "@supabase/supabase-js";

let cached = null;

/**
 * Returns a singleton Supabase client authenticated with the service-role key.
 * The service role bypasses RLS, so this client must NEVER be exposed to the
 * browser — it only lives inside Netlify Functions.
 */
export function getSupabase() {
  if (cached) return cached;

  const url =
    Netlify.env.get("SUPABASE_URL") || Netlify.env.get("VITE_SUPABASE_URL");
  const serviceKey = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cached;
}
