import { getSupabase } from "./_shared/supabase.mjs";
import { json, preflight, readBody, clean } from "./_shared/http.mjs";
import { computeNextRunLabel, triggerBackgroundCampaignSend } from "./_shared/campaign-send.mjs";
import {
  FLYER_MAX_BYTES,
  FLYER_TYPES,
  flyerPublicUrl,
  parseFlyerId,
  saveFlyer,
} from "./_shared/flyers.mjs";

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
    .select(
      "id, subject, status, total_recipients, sent_count, failed_count, created_at, sent_at, error, flyer_id, flyer_html"
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

async function bouncedContacts(supabase) {
  const { data, error } = await supabase
    .from("email_bounced_contacts")
    .select("id, email, first_name, last_name, bounced_at, bounce_kind, bounce_reason")
    .order("bounced_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data || [];
}

function contactEmailStatus(lead) {
  if (lead.bounced_at) return "bounced";
  if (lead.unsubscribed_at) return "unsubscribed";
  return "active";
}

function latestByLead(rows, leadKey = "lead_id") {
  const map = new Map();
  for (const row of rows || []) {
    const id = row[leadKey];
    if (!id || map.has(id)) continue;
    map.set(id, row);
  }
  return map;
}

function interestsLabel(reservation) {
  const labels = (reservation?.interests || [])
    .map((i) => i.interest_type?.label)
    .filter(Boolean);
  return labels.length ? labels.join(", ") : null;
}

async function listContacts(supabase, url) {
  const limit = Math.min(Number(url.searchParams.get("limit")) || 500, 500);

  const { data: leads, error, count } = await supabase
    .from("leads")
    .select(
      "id, email, first_name, last_name, phone, status, first_seen_at, last_contact_at, created_at, unsubscribed_at, bounced_at, bounce_kind",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!leads?.length) {
    return { total: count || 0, with_phone: 0, contacts: [] };
  }

  const ids = leads.map((l) => l.id);

  const [overviewRes, contactRowsRes, reservationRowsRes, interestRowsRes] = await Promise.all([
    supabase
      .from("analytics_lead_overview")
      .select("id, contact_submissions, reservation_requests, linked_visitors")
      .in("id", ids),
    supabase
      .from("contact_submissions")
      .select("lead_id, message, created_at")
      .in("lead_id", ids)
      .order("created_at", { ascending: false }),
    supabase
      .from("reservation_requests")
      .select("id, lead_id, session_time, launch_location, preferred_date, created_at")
      .in("lead_id", ids)
      .order("created_at", { ascending: false }),
    supabase
      .from("reservation_request_interests")
      .select("reservation_request_id, interest_types(label)"),
  ]);

  if (overviewRes.error) throw overviewRes.error;
  if (contactRowsRes.error) throw contactRowsRes.error;
  if (reservationRowsRes.error) throw reservationRowsRes.error;
  if (interestRowsRes.error) throw interestRowsRes.error;

  const overviewMap = new Map((overviewRes.data || []).map((r) => [r.id, r]));
  const latestContact = latestByLead(contactRowsRes.data);
  const latestReservation = latestByLead(reservationRowsRes.data);

  const reservationIds = new Set((reservationRowsRes.data || []).map((r) => r.id));
  const interestsByReservation = new Map();
  for (const row of interestRowsRes.data || []) {
    if (!reservationIds.has(row.reservation_request_id)) continue;
    const label = row.interest_types?.label;
    if (!label) continue;
    const list = interestsByReservation.get(row.reservation_request_id) || [];
    list.push(label);
    interestsByReservation.set(row.reservation_request_id, list);
  }

  const contacts = leads.map((lead) => {
    const stats = overviewMap.get(lead.id) || {};
    const contactCount = Number(stats.contact_submissions) || 0;
    const reservationCount = Number(stats.reservation_requests) || 0;
    const sources = [];
    if (contactCount > 0) sources.push("contact");
    if (reservationCount > 0) sources.push("reservation");

    const lastContact = latestContact.get(lead.id);
    const lastReservation = latestReservation.get(lead.id);
    const lastActivity = [lastContact?.created_at, lastReservation?.created_at, lead.last_contact_at, lead.created_at]
      .filter(Boolean)
      .sort()
      .pop();

    const lastInterests = lastReservation
      ? (interestsByReservation.get(lastReservation.id) || []).join(", ")
      : null;

    return {
      id: lead.id,
      email: lead.email,
      first_name: lead.first_name,
      last_name: lead.last_name,
      phone: lead.phone,
      status: lead.status,
      email_status: contactEmailStatus(lead),
      sources,
      contact_submissions: contactCount,
      reservation_requests: reservationCount,
      linked_visitors: Number(stats.linked_visitors) || 0,
      first_seen_at: lead.first_seen_at,
      last_contact_at: lead.last_contact_at,
      created_at: lead.created_at,
      last_activity_at: lastActivity || null,
      last_message_preview: lastContact?.message ? clean(lastContact.message, 160) : null,
      last_session_time: lastReservation?.session_time || null,
      last_launch_location: lastReservation?.launch_location || null,
      last_preferred_date: lastReservation?.preferred_date
        ? clean(lastReservation.preferred_date, 160)
        : null,
      last_interests: lastInterests || null,
    };
  });

  return {
    total: count || contacts.length,
    with_phone: contacts.filter((c) => c.phone).length,
    contacts,
  };
}

async function contactDetail(supabase, url) {
  const id = url.searchParams.get("id");
  if (!id) return { error: "missing id" };

  const [leadRes, contactsRes, reservationsRes, visitorsRes] = await Promise.all([
    supabase.from("leads").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("contact_submissions")
      .select("id, name, email, message, status, source_path, created_at")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("reservation_requests")
      .select(
        "id, first_name, last_name, email, phone, session_time, launch_location, preferred_date, status, source_path, created_at"
      )
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("visitors")
      .select("id, visitor_token, device_type, browser, total_sessions, total_page_views, last_seen_at")
      .eq("lead_id", id)
      .order("last_seen_at", { ascending: false })
      .limit(20),
  ]);

  if (leadRes.error) throw leadRes.error;
  if (contactsRes.error) throw contactsRes.error;
  if (reservationsRes.error) throw reservationsRes.error;
  if (visitorsRes.error) throw visitorsRes.error;
  if (!leadRes.data) return { error: "Contact not found" };

  const reservationIds = (reservationsRes.data || []).map((r) => r.id);
  let interests = [];
  if (reservationIds.length) {
    const { data, error } = await supabase
      .from("reservation_request_interests")
      .select("reservation_request_id, interest_types(label, slug)")
      .in("reservation_request_id", reservationIds);
    if (error) throw error;
    interests = data || [];
  }

  const interestsByReservation = new Map();
  for (const row of interests) {
    const list = interestsByReservation.get(row.reservation_request_id) || [];
    if (row.interest_types?.label) list.push(row.interest_types.label);
    interestsByReservation.set(row.reservation_request_id, list);
  }

  const reservations = (reservationsRes.data || []).map((r) => ({
    ...r,
    interests: interestsByReservation.get(r.id) || [],
  }));

  return {
    lead: leadRes.data,
    contact_submissions: contactsRes.data || [],
    reservation_requests: reservations,
    visitors: visitorsRes.data || [],
  };
}

async function removeContact(supabase, req) {
  const body = await readBody(req);
  const id = body.id;
  if (!id) return { error: "Missing contact id.", status: 400 };
  const { data, error } = await supabase.rpc("admin_delete_lead", { p_id: id });
  if (error) throw error;
  if (data?.error) return { error: data.error, status: 404 };
  return { ok: true, id };
}

async function removeAllBounced(supabase) {
  const { data, error } = await supabase.rpc("admin_delete_bounced_leads");
  if (error) throw error;
  return { ok: true, deleted: data?.deleted || 0 };
}

async function markBounced(supabase, req) {
  const body = await readBody(req);
  const email = clean(body.email, 320);
  const reason = clean(body.reason, 500) || "Marked bounced manually";
  if (!email) return { error: "Email is required.", status: 400 };
  const { data, error } = await supabase.rpc("handle_email_bounce", {
    p_email: email,
    p_reason: reason,
    p_kind: "bounce",
    p_permanent: Boolean(body.permanent),
    p_raw: null,
  });
  if (error) throw error;
  return data || { ok: true };
}

async function sendCampaign(supabase, req) {
  const body = await readBody(req);
  const subject = clean(body.subject, 300);
  const html = clean(body.html, 200000);
  if (!subject || !html) return { error: "Subject and message are required.", status: 400 };

  const flyerId = parseFlyerId(body.flyer_id);
  if (flyerId?.error) return flyerId;
  const flyerHtml = clean(body.flyer_html, 500000) || null;

  const { data, error } = await supabase
    .from("email_campaigns")
    .insert({ subject, html, status: "sending", flyer_id: flyerId, flyer_html: flyerHtml })
    .select("id")
    .single();
  if (error) throw error;

  const base = (
    Netlify.env.get("SITE_URL") ||
    new URL(req.url).origin
  ).replace(/\/$/, "");
  const token = Netlify.env.get("ADMIN_PASSWORD");
  try {
    await triggerBackgroundCampaignSend({ base, campaignId: data.id, token });
  } catch (err) {
    console.error("failed to trigger campaign sender:", err);
  }

  return { ok: true, id: data.id };
}

async function uploadFlyer(req) {
  const body = await readBody(req);
  const contentType = clean(body.content_type, 64);
  const data = body.data;

  if (!data || typeof data !== "string") {
    return { error: "Image data is required.", status: 400 };
  }
  if (!FLYER_TYPES.has(contentType)) {
    return { error: "Use a JPG, PNG, WebP, or GIF image.", status: 400 };
  }

  let buffer;
  try {
    buffer = Buffer.from(data, "base64");
  } catch {
    return { error: "Could not read image data.", status: 400 };
  }
  if (!buffer.length || buffer.length > FLYER_MAX_BYTES) {
    return { error: "Image must be under 2 MB.", status: 400 };
  }

  const id = crypto.randomUUID();
  await saveFlyer(id, buffer, contentType);

  const base = (
    Netlify.env.get("SITE_URL") ||
    new URL(req.url).origin
  ).replace(/\/$/, "");

  return { ok: true, id, url: flyerPublicUrl(base, id) };
}

function parseScheduleBody(body) {
  const subject = clean(body.subject, 300);
  const html = clean(body.html, 200000);
  const name = clean(body.name, 120) || null;
  const day = Math.min(Math.max(Number(body.day_of_month) || 1, 1), 31);
  const hour = Math.min(Math.max(Number(body.send_hour) ?? 9, 0), 23);
  return { subject, html, name, day_of_month: day, send_hour: hour };
}

async function listSchedules(supabase) {
  const { data, error } = await supabase
    .from("email_schedules")
    .select(
      "id, name, subject, day_of_month, send_hour, timezone, enabled, last_sent_at, created_at, updated_at, flyer_id, flyer_html"
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => ({
    ...row,
    next_run: computeNextRunLabel(row),
  }));
}

async function createSchedule(supabase, req) {
  const body = await readBody(req);
  const { subject, html, name, day_of_month, send_hour } = parseScheduleBody(body);
  if (!subject || !html) return { error: "Subject and message are required.", status: 400 };

  const flyerId = parseFlyerId(body.flyer_id);
  if (flyerId?.error) return flyerId;
  const flyerHtml = clean(body.flyer_html, 500000) || null;

  const { data, error } = await supabase
    .from("email_schedules")
    .insert({
      name,
      subject,
      html,
      day_of_month,
      send_hour,
      enabled: body.enabled !== false,
      flyer_id: flyerId,
      flyer_html: flyerHtml,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { ok: true, id: data.id };
}

async function updateSchedule(supabase, req) {
  const body = await readBody(req);
  const id = body.id;
  if (!id) return { error: "Missing schedule id.", status: 400 };

  const patch = {};
  if (body.enabled !== undefined) patch.enabled = Boolean(body.enabled);
  if (body.subject !== undefined) patch.subject = clean(body.subject, 300);
  if (body.html !== undefined) patch.html = clean(body.html, 200000);
  if (body.name !== undefined) patch.name = clean(body.name, 120) || null;
  if (body.day_of_month !== undefined) {
    patch.day_of_month = Math.min(Math.max(Number(body.day_of_month) || 1, 1), 31);
  }
  if (body.send_hour !== undefined) {
    patch.send_hour = Math.min(Math.max(Number(body.send_hour) ?? 9, 0), 23);
  }
  if (body.flyer_id !== undefined) {
    const flyerId = parseFlyerId(body.flyer_id);
    if (flyerId?.error) return flyerId;
    patch.flyer_id = flyerId;
  }
  if (body.flyer_html !== undefined) {
    patch.flyer_html = clean(body.flyer_html, 500000) || null;
  }

  if (!Object.keys(patch).length) return { error: "Nothing to update.", status: 400 };

  const { error } = await supabase.from("email_schedules").update(patch).eq("id", id);
  if (error) throw error;
  return { ok: true, id };
}

async function deleteSchedule(supabase, req) {
  const body = await readBody(req);
  const id = body.id;
  if (!id) return { error: "Missing schedule id.", status: 400 };
  const { error } = await supabase.from("email_schedules").delete().eq("id", id);
  if (error) throw error;
  return { ok: true, id };
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
        case "remove_contact": {
          const result = await removeContact(supabase, req);
          return json(result, result.status || (result.error ? 400 : 200));
        }
        case "remove_all_bounced": {
          return json(await removeAllBounced(supabase));
        }
        case "mark_bounced": {
          const result = await markBounced(supabase, req);
          return json(result, result.status || (result.error ? 400 : 200));
        }
        case "upload_flyer": {
          const result = await uploadFlyer(req);
          return json(result, result.status || (result.error ? 400 : 200));
        }
        case "create_schedule": {
          const result = await createSchedule(supabase, req);
          return json(result, result.status || (result.error ? 400 : 200));
        }
        case "update_schedule": {
          const result = await updateSchedule(supabase, req);
          return json(result, result.status || (result.error ? 400 : 200));
        }
        case "delete_schedule": {
          const result = await deleteSchedule(supabase, req);
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
      case "bounced_contacts":
        return json(await bouncedContacts(supabase));
      case "contacts":
        return json(await listContacts(supabase, url));
      case "contact":
        return json(await contactDetail(supabase, url));
      case "schedules":
        return json(await listSchedules(supabase));
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
