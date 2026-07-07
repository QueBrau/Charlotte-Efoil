// =============================================================================
// Admin dashboard demo data — use ?mock=1 on /admin.html to preview the UI
// without Supabase or Netlify Functions configured.
// =============================================================================

export function isMockMode() {
  return new URLSearchParams(window.location.search).get("mock") === "1";
}

function isoDaysAgo(days, hour = 12) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, Math.floor(Math.random() * 50), 0, 0);
  return d.toISOString();
}

function dayKey(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

const VISITOR_IDS = [
  "a1000001-0000-4000-8000-000000000001",
  "a1000002-0000-4000-8000-000000000002",
  "a1000003-0000-4000-8000-000000000003",
  "a1000004-0000-4000-8000-000000000004",
  "a1000005-0000-4000-8000-000000000005",
  "a1000006-0000-4000-8000-000000000006",
  "a1000007-0000-4000-8000-000000000007",
  "a1000008-0000-4000-8000-000000000008",
];

const MOCK_VISITORS = VISITOR_IDS.map((id, i) => ({
  id,
  visitor_token: `demo-${String(i + 1).padStart(4, "0")}-token`,
  device_type: ["mobile", "desktop", "mobile", "tablet", "desktop", "mobile", "desktop", "mobile"][i],
  browser: ["Safari", "Chrome", "Chrome", "Safari", "Edge", "Chrome", "Firefox", "Safari"][i],
  os: ["iOS", "Windows", "Android", "iOS", "Windows", "Android", "macOS", "iOS"][i],
  country: ["US", "US", "US", "US", "US", "US", "US", "US"][i],
  first_seen_at: isoDaysAgo(28 - i * 2),
  last_seen_at: isoDaysAgo(i % 3, 18 - i),
  total_sessions: [4, 2, 6, 1, 3, 5, 2, 7][i],
  total_page_views: [18, 7, 24, 3, 11, 19, 8, 31][i],
  lead_email: i < 3 ? ["sarah.m@email.com", "mike.j@email.com", "hello@charlotteefoil.com"][i] : null,
}));

const MOCK_VISITOR_DETAILS = Object.fromEntries(
  MOCK_VISITORS.map((v, i) => [
    v.id,
    {
      visitor: {
        ...v,
        city: "Charlotte",
        region: "NC",
        first_referrer: i % 2 ? "https://www.google.com/" : "",
        first_utm_source: i === 4 ? "instagram" : "",
        lead:
          i < 3
            ? {
                email: v.lead_email,
                first_name: ["Sarah", "Mike", "Alex"][i],
                last_name: ["Miller", "Johnson", "Chen"][i],
                phone: "704-555-010" + i,
                status: ["new", "contacted", "qualified"][i],
              }
            : null,
      },
      sessions: [
        {
          id: `s${i}-1`,
          started_at: isoDaysAgo(2, 10),
          page_view_count: 4,
          referrer: "https://www.google.com/",
        },
        {
          id: `s${i}-2`,
          started_at: isoDaysAgo(8, 14),
          page_view_count: 2,
          referrer: "",
        },
      ],
      page_views: [
        {
          id: `pv${i}-1`,
          path: "/",
          title: "CharlotteEfoil | Efoil Lessons",
          duration_ms: 45000 + i * 3000,
          created_at: isoDaysAgo(1, 11),
        },
        {
          id: `pv${i}-2`,
          path: "/pricing.html",
          title: "Pricing | CharlotteEfoil",
          duration_ms: 28000 + i * 2000,
          created_at: isoDaysAgo(1, 11),
        },
        {
          id: `pv${i}-3`,
          path: "/reservation-request.html",
          title: "Reservations | CharlotteEfoil",
          duration_ms: 92000,
          created_at: isoDaysAgo(2, 9),
        },
      ],
      events: [
        {
          id: `ev${i}-1`,
          event_type: "cta_click",
          event_name: "request_reservation",
          path: "/",
          metadata: { href: "/reservation-request.html" },
          created_at: isoDaysAgo(1, 11),
        },
        {
          id: `ev${i}-2`,
          event_type: "phone_click",
          event_name: "call",
          path: "/pricing.html",
          metadata: { href: "tel:7044218778" },
          created_at: isoDaysAgo(2, 10),
        },
      ],
    },
  ])
);

function buildDaily() {
  return Array.from({ length: 30 }, (_, i) => {
    const day = 29 - i;
    const sessions = 18 + Math.round(14 * Math.sin(i / 3) + (i % 5) * 2);
    const unique = Math.round(sessions * 0.82);
    const views = sessions * (2.8 + (i % 4) * 0.15);
    return {
      day: dayKey(day),
      sessions,
      unique_visitors: unique,
      page_views: Math.round(views),
    };
  });
}

const DAILY = buildDaily();

function buildDashboard(days) {
  const slice = DAILY.slice(-days);
  const sessions = slice.reduce((a, r) => a + r.sessions, 0);
  const unique = Math.round(sessions * 0.78);
  const pageViews = slice.reduce((a, r) => a + r.page_views, 0);

  return {
    range_days: days,
    totals: { sessions, unique_visitors: unique, page_views: pageViews },
    avg_session_duration_seconds: 143,
    avg_pages_per_session: 3.12,
    bounce_rate: 0.38,
    new_vs_returning: {
      new: Math.round(unique * 0.68),
      returning: Math.round(unique * 0.32),
    },
    sessions_by_device: [
      { label: "mobile", sessions: Math.round(sessions * 0.58) },
      { label: "desktop", sessions: Math.round(sessions * 0.34) },
      { label: "tablet", sessions: Math.round(sessions * 0.08) },
    ],
    channels: [
      { label: "Organic search", sessions: Math.round(sessions * 0.42), unique_visitors: Math.round(unique * 0.4) },
      { label: "Direct", sessions: Math.round(sessions * 0.31), unique_visitors: Math.round(unique * 0.32) },
      { label: "Referral", sessions: Math.round(sessions * 0.14), unique_visitors: Math.round(unique * 0.13) },
      { label: "Marketing", sessions: Math.round(sessions * 0.13), unique_visitors: Math.round(unique * 0.15) },
    ],
    sessions_over_time: slice.map((r) => ({
      day: r.day,
      sessions: r.sessions,
      unique_visitors: r.unique_visitors,
      page_views: r.page_views,
    })),
    form_submissions: 37,
    contact_submissions: 22,
    reservation_requests: 15,
  };
}

let MOCK_BOUNCED = [
  {
    id: "b1000001-0000-4000-8000-000000000001",
    email: "bad.address@example.com",
    first_name: "Bad",
    last_name: "Address",
    bounced_at: isoDaysAgo(3),
    bounce_kind: "bounce",
    bounce_reason: "Permanent · Suppressed",
  },
  {
    id: "b1000002-0000-4000-8000-000000000002",
    email: "old.inbox@example.net",
    first_name: null,
    last_name: null,
    bounced_at: isoDaysAgo(8),
    bounce_kind: "send_failure",
    bounce_reason: "Mailbox does not exist",
  },
];

function mockNextRun(day, hour) {
  const now = new Date();
  let month = now.getMonth();
  let year = now.getFullYear();
  if (now.getDate() > day || (now.getDate() === day && now.getHours() >= hour)) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${labels[month]} ${day}, ${year} · ${h12}:00 ${ampm} ET`;
}

let MOCK_SCHEDULES = [
  {
    id: "s1000001-0000-4000-8000-000000000001",
    name: "Monthly lake update",
    subject: "Flat water & open dates this month",
    day_of_month: 20,
    send_hour: 9,
    timezone: "America/New_York",
    enabled: true,
    last_sent_at: isoDaysAgo(40),
    next_run: mockNextRun(20, 9),
  },
];

const MOCK_EVENTS = [
  { id: "e1", visitor_id: VISITOR_IDS[0], event_type: "cta_click", event_name: "request_reservation", path: "/", metadata: { href: "/reservation-request.html" }, created_at: isoDaysAgo(0, 16) },
  { id: "e2", visitor_id: VISITOR_IDS[1], event_type: "phone_click", event_name: "call", path: "/pricing.html", metadata: { href: "tel:7044218778" }, created_at: isoDaysAgo(0, 14) },
  { id: "e3", visitor_id: VISITOR_IDS[2], event_type: "form_start", event_name: "reservation", path: "/reservation-request.html", metadata: {}, created_at: isoDaysAgo(1, 11) },
  { id: "e4", visitor_id: VISITOR_IDS[2], event_type: "form_submit", event_name: "reservation", path: "/reservation-request.html", metadata: {}, created_at: isoDaysAgo(1, 11) },
  { id: "e5", visitor_id: VISITOR_IDS[3], event_type: "social_click", event_name: "instagram", path: "/", metadata: { href: "https://www.instagram.com/charlotteefoil" }, created_at: isoDaysAgo(1, 9) },
  { id: "e6", visitor_id: VISITOR_IDS[4], event_type: "cta_click", event_name: "request_reservation", path: "/flight-lessons.html", metadata: { href: "/reservation-request.html" }, created_at: isoDaysAgo(2, 15) },
  { id: "e7", visitor_id: VISITOR_IDS[5], event_type: "form_start", event_name: "contact", path: "/contact.html", metadata: {}, created_at: isoDaysAgo(2, 12) },
  { id: "e8", visitor_id: VISITOR_IDS[5], event_type: "form_submit", event_name: "contact", path: "/contact.html", metadata: {}, created_at: isoDaysAgo(2, 12) },
  { id: "e9", visitor_id: VISITOR_IDS[6], event_type: "phone_click", event_name: "call", path: "/", metadata: { href: "tel:7044218778" }, created_at: isoDaysAgo(3, 10) },
  { id: "e10", visitor_id: VISITOR_IDS[7], event_type: "cta_click", event_name: "request_reservation", path: "/corporate.html", metadata: { href: "/reservation-request.html" }, created_at: isoDaysAgo(4, 13) },
];

/** Simulate network latency so loading states are visible briefly. */
function delay(ms = 180) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function mockApi(action, params = {}, method = "GET", body = {}) {
  await delay();

  if (method === "POST") {
    if (action === "send_campaign") {
      return { ok: true, id: "demo-campaign-" + Date.now() };
    }
    if (action === "upload_flyer") {
      return {
        ok: true,
        id: "f1000001-0000-4000-8000-000000000001",
        url: null,
      };
    }
    if (action === "remove_contact") {
      MOCK_BOUNCED = MOCK_BOUNCED.filter((r) => r.id !== body.id);
      return { ok: true, id: body.id };
    }
    if (action === "remove_all_bounced") {
      const deleted = MOCK_BOUNCED.length;
      MOCK_BOUNCED = [];
      return { ok: true, deleted };
    }
    if (action === "mark_bounced") {
      return { ok: true, deleted: Boolean(body.permanent) };
    }
    if (action === "create_schedule") {
      const day = Math.min(Math.max(Number(body.day_of_month) || 20, 1), 31);
      const hour = Math.min(Math.max(Number(body.send_hour) ?? 9, 0), 23);
      const row = {
        id: "s-demo-" + Date.now(),
        name: body.name?.trim() || null,
        subject: body.subject?.trim() || "Untitled",
        day_of_month: day,
        send_hour: hour,
        timezone: "America/New_York",
        enabled: true,
        last_sent_at: null,
        next_run: mockNextRun(day, hour),
      };
      MOCK_SCHEDULES.unshift(row);
      return { ok: true, id: row.id };
    }
    if (action === "update_schedule") {
      const row = MOCK_SCHEDULES.find((s) => s.id === body.id);
      if (row && body.enabled !== undefined) row.enabled = Boolean(body.enabled);
      return { ok: true, id: body.id };
    }
    if (action === "delete_schedule") {
      MOCK_SCHEDULES = MOCK_SCHEDULES.filter((s) => s.id !== body.id);
      return { ok: true, id: body.id };
    }
    return { error: "Unknown action" };
  }

  switch (action) {
    case "overview":
      return {
        unique_visitors: 847,
        sessions: 1124,
        page_views: 3412,
        events: 2891,
        leads: 156,
        contact_submissions: 89,
        reservation_requests: 67,
        pages_per_session: 3.04,
      };
    case "dashboard":
      return buildDashboard(Math.min(Math.max(Number(params.days) || 30, 1), 90));
    case "daily":
      return DAILY;
    case "top_pages":
      return [
        { path: "/", views: 1240, unique_visitors: 680, avg_time_ms: 62000 },
        { path: "/pricing.html", views: 890, unique_visitors: 520, avg_time_ms: 48000 },
        { path: "/reservation-request.html", views: 610, unique_visitors: 410, avg_time_ms: 95000 },
        { path: "/flight-lessons.html", views: 420, unique_visitors: 310, avg_time_ms: 54000 },
        { path: "/contact.html", views: 280, unique_visitors: 220, avg_time_ms: 41000 },
        { path: "/corporate.html", views: 195, unique_visitors: 160, avg_time_ms: 58000 },
        { path: "/about.html", views: 142, unique_visitors: 118, avg_time_ms: 72000 },
      ];
    case "sources":
      return [
        { source: "google", medium: "organic", sessions: 412, unique_visitors: 360 },
        { source: "(direct)", medium: "(none)", sessions: 298, unique_visitors: 260 },
        { source: "instagram.com", medium: "referral", sessions: 118, unique_visitors: 95 },
        { source: "facebook", medium: "cpc", sessions: 82, unique_visitors: 70 },
        { source: "bing", medium: "organic", sessions: 54, unique_visitors: 48 },
      ];
    case "visitors":
      return MOCK_VISITORS.slice(0, Number(params.limit) || 100);
    case "visitor":
      return MOCK_VISITOR_DETAILS[params.id] || { visitor: null, sessions: [], page_views: [], events: [] };
    case "bounced_contacts":
      return MOCK_BOUNCED;
    case "schedules":
      return MOCK_SCHEDULES;
    case "events":
      return MOCK_EVENTS.slice(0, Number(params.limit) || 100);
    case "audience_count":
      return { count: 847 };
    case "campaigns":
      return [
        {
          id: "c1",
          subject: "Flat water & open dates this month",
          status: "sent",
          total_recipients: 812,
          sent_count: 809,
          failed_count: 3,
          flyer_id: "f1000001-0000-4000-8000-000000000001",
          flyer_html: "<table><tr><td><h1>July lake update</h1></td></tr></table>",
          created_at: isoDaysAgo(12),
          sent_at: isoDaysAgo(12),
          error: null,
        },
        {
          id: "c2",
          subject: "Summer eFoil lessons — book your flight",
          status: "sent",
          total_recipients: 798,
          sent_count: 798,
          failed_count: 0,
          flyer_id: null,
          created_at: isoDaysAgo(28),
          sent_at: isoDaysAgo(28),
          error: null,
        },
      ];
    default:
      return {};
  }
}

export function showDemoBanner() {
  const topbar = document.querySelector(".topbar");
  if (!topbar || topbar.querySelector("[data-demo-banner]")) return;
  const pill = document.createElement("span");
  pill.dataset.demoBanner = "";
  pill.textContent = "Demo data";
  pill.style.cssText =
    "font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;padding:0.3rem 0.65rem;border-radius:999px;background:rgba(79,176,212,0.15);color:#4fb0d4;border:1px solid rgba(79,176,212,0.35);";
  topbar.querySelector("h1")?.insertAdjacentElement("afterend", pill);
}
