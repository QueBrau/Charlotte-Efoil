import { getSupabase } from "./_shared/supabase.mjs";
import { json, preflight } from "./_shared/http.mjs";

/** Constant-time-ish comparison to avoid trivial timing leaks. */
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isAuthed(req) {
  const expected = Netlify.env.get("ADMIN_PASSWORD");
  if (!expected) return false; // dashboard disabled until a password is set
  const header = req.headers.get("authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  return safeEqual(token, expected);
}

async function countOf(supabase, table) {
  const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
  return count || 0;
}

async function overview(supabase) {
  const [visitors, sessions, pageViews, events, leads, contacts, reservations] =
    await Promise.all([
      countOf(supabase, "visitors"),
      countOf(supabase, "sessions"),
      countOf(supabase, "page_views"),
      countOf(supabase, "events"),
      countOf(supabase, "leads"),
      countOf(supabase, "contact_submissions"),
      countOf(supabase, "reservation_requests"),
    ]);

  return {
    unique_visitors: visitors,
    sessions,
    page_views: pageViews,
    events,
    leads,
    contact_submissions: contacts,
    reservation_requests: reservations,
    pages_per_session: sessions ? +(pageViews / sessions).toFixed(2) : 0,
  };
}

async function visitors(supabase, url) {
  const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 500);
  const offset = Number(url.searchParams.get("offset")) || 0;
  const { data, error } = await supabase
    .from("visitors")
    .select(
      "id, visitor_token, device_type, browser, os, country, first_seen_at, last_seen_at, total_sessions, total_page_views, lead:leads(email, first_name, last_name)"
    )
    .order("last_seen_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return (data || []).map((v) => ({
    ...v,
    lead_email: v.lead?.email || null,
    lead: undefined,
  }));
}

async function visitorDetail(supabase, url) {
  const id = url.searchParams.get("id");
  if (!id) return { error: "missing id" };

  const [visitor, sessions, pages, evts] = await Promise.all([
    supabase
      .from("visitors")
      .select("*, lead:leads(email, first_name, last_name, phone, status)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("sessions")
      .select("*")
      .eq("visitor_id", id)
      .order("started_at", { ascending: false })
      .limit(100),
    supabase
      .from("page_views")
      .select("id, session_id, path, title, duration_ms, referrer, created_at")
      .eq("visitor_id", id)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("events")
      .select("id, session_id, event_type, event_name, path, metadata, created_at")
      .eq("visitor_id", id)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  return {
    visitor: visitor.data || null,
    sessions: sessions.data || [],
    page_views: pages.data || [],
    events: evts.data || [],
  };
}

async function fromView(supabase, view, limit = 100) {
  const { data, error } = await supabase.from(view).select("*").limit(limit);
  if (error) throw error;
  return data || [];
}

async function recentEvents(supabase, url) {
  const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 500);
  const { data, error } = await supabase
    .from("events")
    .select("id, visitor_id, event_type, event_name, path, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export default async (req) => {
  if (req.method === "OPTIONS") return preflight();

  if (!isAuthed(req)) return json({ error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "overview";

  try {
    const supabase = getSupabase();
    switch (action) {
      case "overview":
        return json(await overview(supabase));
      case "visitors":
        return json(await visitors(supabase, url));
      case "visitor":
        return json(await visitorDetail(supabase, url));
      case "top_pages":
        return json(await fromView(supabase, "analytics_top_pages", 100));
      case "daily":
        return json(await fromView(supabase, "analytics_daily_traffic", 30));
      case "sources":
        return json(await fromView(supabase, "analytics_traffic_sources", 50));
      case "events":
        return json(await recentEvents(supabase, url));
      default:
        return json({ error: "Unknown action" }, 400);
    }
  } catch (err) {
    console.error("admin action failed:", action, err);
    return json({ error: "Query failed" }, 500);
  }
};

export const config = {
  path: "/api/admin",
  method: ["GET", "OPTIONS"],
};
