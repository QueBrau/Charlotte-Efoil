import { getSupabase } from "./_shared/supabase.mjs";
import { json, noContent, preflight, readBody, hashIp, clean } from "./_shared/http.mjs";

const MAX_EVENTS = 50;

export default async (req, context) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = await readBody(req);
  const visitorToken = clean(body.visitor_token, 100);
  const sessionToken = clean(body.session_token, 100);

  // Without identifiers there is nothing to attribute — accept and drop.
  if (!visitorToken || !sessionToken) return noContent();

  const events = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS) : [];

  const geo = context.geo || {};
  const payload = {
    visitor_token: visitorToken,
    session_token: sessionToken,
    referrer: clean(body.referrer, 1000),
    landing_path: clean(body.landing_path, 500),
    user_agent: clean(req.headers.get("user-agent"), 1000),
    device_type: clean(body.device_type, 20) || "unknown",
    browser: clean(body.browser, 60),
    os: clean(body.os, 60),
    utm_source: clean(body.utm_source, 200),
    utm_medium: clean(body.utm_medium, 200),
    utm_campaign: clean(body.utm_campaign, 200),
    utm_term: clean(body.utm_term, 200),
    utm_content: clean(body.utm_content, 200),
    ip_hash: await hashIp(context.ip),
    country: geo.country?.code || null,
    region: geo.subdivision?.code || null,
    city: geo.city || null,
    events: events.map((e) => ({
      type: clean(e.type, 50) || "custom",
      name: clean(e.name, 120),
      path: clean(e.path, 500),
      title: clean(e.title, 300),
      referrer: clean(e.referrer, 1000),
      client_view_id: clean(e.client_view_id, 100),
      duration_ms: Number.isFinite(e.duration_ms) ? Math.round(e.duration_ms) : null,
      metadata: e.metadata && typeof e.metadata === "object" ? e.metadata : {},
      ts: clean(e.ts, 40),
    })),
  };

  try {
    const supabase = getSupabase();
    const { error } = await supabase.rpc("ingest_tracking", { p: payload });
    if (error) throw error;
  } catch (err) {
    console.error("track failed:", err);
    // Tracking must never break the user experience — swallow errors.
  }

  return noContent();
};

export const config = {
  path: "/api/track",
  method: ["POST", "OPTIONS"],
};
