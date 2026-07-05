import { getSupabase } from "./_shared/supabase.mjs";
import { json, preflight, readBody, clean } from "./_shared/http.mjs";

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

async function dashboard(supabase, url) {
  const days = Math.min(Math.max(Number(url.searchParams.get("days")) || 30, 1), 365);
  const { data, error } = await supabase.rpc("admin_dashboard", { p_days: days });
  if (error) throw error;
  return data || {};
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

async function audienceCount(supabase) {
  const { count } = await supabase
    .from("email_audience")
    .select("*", { count: "exact", head: true });
  return { count: count || 0 };
}

async function campaigns(supabase) {
  const { data, error } = await supabase
    .from("email_campaigns")
    .select("id, subject, status, total_recipients, sent_count, failed_count, created_at, sent_at, error")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

async function sendCampaign(supabase, req) {
  const body = await readBody(req);
  const subject = clean(body.subject, 300);
  const html = clean(body.html, 200000);
  if (!subject || !html) return { error: "Subject and message are required.", status: 400 };

  const { data, error } = await supabase
    .from("email_campaigns")
    .insert({ subject, html, status: "sending" })
    .select("id")
    .single();
  if (error) throw error;

  // Fire the background sender (returns 202 quickly).
  const base = (
    Netlify.env.get("SITE_URL") ||
    new URL(req.url).origin
  ).replace(/\/$/, "");
  const token = Netlify.env.get("ADMIN_PASSWORD");
  try {
    await fetch(`${base}/.netlify/functions/send-campaign-background`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaign_id: data.id, token }),
    });
  } catch (err) {
    console.error("failed to trigger campaign sender:", err);
  }

  return { ok: true, id: data.id };
}

export default async (req) => {
  if (req.method === "OPTIONS") return preflight();

  if (!isAuthed(req)) return json({ error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "overview";

  try {
    const supabase = getSupabase();

    if (req.method === "POST") {
      switch (action) {
        case "send_campaign": {
          const result = await sendCampaign(supabase, req);
          return json(result, result.status || (result.error ? 400 : 200));
        }
        default:
          return json({ error: "Unknown action" }, 400);
      }
    }

    switch (action) {
      case "overview":
        return json(await overview(supabase));
      case "dashboard":
        return json(await dashboard(supabase, url));
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
      case "audience_count":
        return json(await audienceCount(supabase));
      case "campaigns":
        return json(await campaigns(supabase));
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
  method: ["GET", "POST", "OPTIONS"],
};
