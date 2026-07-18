// =============================================================================
// CharlotteEfoil — admin analytics dashboard
// Password-gated client for the /api/admin endpoint. The password is held only
// in sessionStorage and sent as a bearer token; all data stays server-side.
// =============================================================================

import Chart from "chart.js/auto";
import { isMockMode, mockApi, showDemoBanner } from "./admin-mock.js";
import { NEWSLETTER_TEMPLATES } from "./newsletter-templates.js";
import { initHomeTabs, renderHome, resizeHomeCharts } from "./admin-home.js";
import { initContentPanel } from "./admin-content.js";

Chart.defaults.color = "#6b7c93";
Chart.defaults.borderColor = "#e6ebf2";
Chart.defaults.font.family = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const API_BASE = window.CE_API_BASE || "/api";
const TOKEN_KEY = "ce_admin_token";
const PALETTE = ["#4fb0d4", "#46c78f", "#e8b04b", "#b57edc", "#e87b7b", "#7bc4e8", "#9ad46f"];

let rangeDays = 30;
let activeTab = "overview";
let loadContentPanel = null;

const PAGE_META = {
  overview: {
    title: "Home",
    subtitle: "Performance overview for your CharlotteEfoil site",
    meta: "Analytics dashboard",
  },
  traffic: {
    title: "Traffic",
    subtitle: "All time totals, daily trends, and top pages",
    meta: "Traffic reporting",
  },
  visitors: {
    title: "Visitors",
    subtitle: "Unique browsers and session history",
    meta: "Audience tracking",
  },
  behavior: {
    title: "Behavior",
    subtitle: "Recent link clicks, CTA taps, and form interactions",
    meta: "Engagement events",
  },
  contacts: {
    title: "Contacts",
    subtitle: "People who submitted contact or reservation forms",
    meta: "Lead management",
  },
  media: {
    title: "Media library",
    subtitle: "Logos, photos, and videos for email flyers",
    meta: "Asset management",
  },
  content: {
    title: "Site content",
    subtitle: "Edit website text and images without touching code",
    meta: "Content management",
  },
  email: {
    title: "Email marketing",
    subtitle: "Campaigns, scheduled sends, and bounce cleanup",
    meta: "Marketing tools",
  },
};

const STAT_ICONS = {
  sessions:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M3 3v18h18"/><path d="M7 14l3-3 3 2 5-6"/></svg>',
  visitors:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5"/></svg>',
  clock:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
  pages:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M4 4h16v16H4z"/><path d="M8 4v16"/></svg>',
  bounce:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.9 4.9l2.8 2.8"/><path d="M16.3 16.3l2.8 2.8"/></svg>',
  forms:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>',
  views:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="2.5"/></svg>',
  growth:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
};

function statCard(label, value, sub = "", icon = STAT_ICONS.sessions, tone = "") {
  return `<div class="stat">
    <div class="stat-icon ${tone}">${icon}</div>
    <div class="stat-body">
      <div class="label">${label}</div>
      <div class="value">${value}</div>${sub ? `<div class="sub">${sub}</div>` : ""}
    </div>
  </div>`;
}

function updatePageHeader(tab = activeTab) {
  const meta = PAGE_META[tab] || PAGE_META.overview;
  const content = document.querySelector(".content");
  if (content) content.classList.toggle("is-home", tab === "overview");
  const title = $("[data-page-title]");
  const subtitle = $("[data-page-subtitle]");
  const pageMeta = $("[data-page-meta]");
  if (title) title.textContent = meta.title;
  if (subtitle) {
    subtitle.textContent =
      tab === "overview" ? `Campaign overview · last ${rangeDays} days` : meta.subtitle;
  }
  if (pageMeta) pageMeta.textContent = meta.meta;
}

const $ = (sel) => document.querySelector(sel);
const gate = $("[data-gate]");
const app = $("[data-app]");

let token = sessionStorage.getItem(TOKEN_KEY) || "";

async function api(action, params = {}) {
  if (isMockMode()) return mockApi(action, params, "GET");

  const url = new URL(`${API_BASE}/admin`, window.location.origin);
  url.searchParams.set("action", action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) {
    const err = new Error("Unauthorized");
    err.code = 401;
    throw err;
  }
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

async function apiPost(action, body = {}) {
  if (isMockMode()) return mockApi(action, {}, "POST", body);

  const url = new URL(`${API_BASE}/admin`, window.location.origin);
  url.searchParams.set("action", action);
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    const err = new Error("Unauthorized");
    err.code = 401;
    throw err;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || "Request failed");
  return data;
}

// ----- formatting helpers ---------------------------------------------------
function fmtNum(n) {
  return (n ?? 0).toLocaleString();
}
function fmtDuration(ms) {
  if (!ms || ms < 1000) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtDay(iso) {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
function shortToken(t) {
  return t ? `${String(t).slice(0, 8)}…` : "—";
}
function fmtSeconds(s) {
  s = Math.round(Number(s) || 0);
  if (s <= 0) return "0s";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
function fmtPct(ratio) {
  return `${((Number(ratio) || 0) * 100).toFixed(1)}%`;
}
function pctOf(part, total) {
  total = Number(total) || 0;
  if (!total) return "0%";
  return `${Math.round((Number(part) / total) * 100)}%`;
}
function cap(s) {
  s = String(s || "");
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// ----- renderers ------------------------------------------------------------
function renderStats(o) {
  const cards = [
    [STAT_ICONS.visitors, "Unique visitors", fmtNum(o.unique_visitors), "", ""],
    [STAT_ICONS.sessions, "Sessions", fmtNum(o.sessions), "", ""],
    [STAT_ICONS.views, "Page views", fmtNum(o.page_views), "", ""],
    [STAT_ICONS.pages, "Pages / session", o.pages_per_session ?? 0, "", "slate"],
    [STAT_ICONS.forms, "Interactions", fmtNum(o.events), "", "amber"],
    [STAT_ICONS.growth, "Leads", fmtNum(o.leads), "", "green"],
    [STAT_ICONS.forms, "Contact forms", fmtNum(o.contact_submissions), "", ""],
    [STAT_ICONS.forms, "Reservations", fmtNum(o.reservation_requests), "", "green"],
  ];
  $("[data-stats]").innerHTML = cards
    .map(([icon, label, value, sub, tone]) => statCard(label, value, sub, icon, tone))
    .join("");
}

// ----- Wix-style dashboard (KPIs + charts) ----------------------------------
const chartBox = (sel) => document.querySelector(sel)?.closest(".chart-box") || null;
const boxes = {
  sessions: chartBox("[data-chart-sessions]"),
  newret: chartBox("[data-chart-newret]"),
  device: chartBox("[data-chart-device]"),
  channels: chartBox("[data-chart-channels]"),
};

function ensureCanvas(box) {
  let c = box.querySelector("canvas");
  if (!c) {
    box.innerHTML = "";
    c = document.createElement("canvas");
    box.appendChild(c);
  }
  return c;
}
function setEmpty(box, key) {
  if (charts[key]) { charts[key].destroy(); delete charts[key]; }
  if (box) box.innerHTML = '<div class="chart-empty">No data in this range yet.</div>';
}

const donutLegend = {
  position: "bottom",
  labels: {
    color: "#6b7c93",
    boxWidth: 12,
    padding: 14,
    generateLabels(chart) {
      const ds = chart.data.datasets[0];
      const total = ds.data.reduce((a, b) => a + Number(b), 0) || 1;
      return chart.data.labels.map((label, i) => ({
        text: `${label} — ${Math.round((Number(ds.data[i]) / total) * 100)}%`,
        fillStyle: ds.backgroundColor[i],
        strokeStyle: ds.backgroundColor[i],
        fontColor: "#6b7c93",
        lineWidth: 0,
        index: i,
      }));
    },
  },
};
const donutTooltip = {
  callbacks: {
    label(ctx) {
      const ds = ctx.dataset;
      const total = ds.data.reduce((a, b) => a + Number(b), 0) || 1;
      const v = Number(ctx.parsed) || 0;
      return ` ${ctx.label}: ${v.toLocaleString()} (${Math.round((v / total) * 100)}%)`;
    },
  },
};

function drawDoughnut(box, key, items) {
  if (!box) return;
  const clean = (items || []).filter((it) => Number(it.value) > 0);
  const total = clean.reduce((a, it) => a + Number(it.value), 0);
  if (!total) return setEmpty(box, key);
  if (charts[key]) { charts[key].destroy(); delete charts[key]; }
  const canvas = ensureCanvas(box);
  charts[key] = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: clean.map((it) => it.label),
      datasets: [
        {
          data: clean.map((it) => Number(it.value)),
          backgroundColor: clean.map((_, i) => PALETTE[i % PALETTE.length]),
          borderColor: "#ffffff",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "62%",
      plugins: { legend: donutLegend, tooltip: donutTooltip },
    },
  });
}

function drawSessions(box, key, rows) {
  if (!box) return;
  if (!rows || !rows.length) return setEmpty(box, key);
  if (charts[key]) { charts[key].destroy(); delete charts[key]; }
  const canvas = ensureCanvas(box);
  charts[key] = new Chart(canvas, {
    type: "line",
    data: {
      labels: rows.map((r) => fmtDay(r.day)),
      datasets: [
        {
          label: "Sessions",
          data: rows.map((r) => Number(r.sessions) || 0),
          borderColor: "#4f7df3",
          backgroundColor: "rgba(79, 125, 243, 0.12)",
          fill: true,
          tension: 0.3,
          pointRadius: 2,
          borderWidth: 2,
        },
        {
          label: "Unique visitors",
          data: rows.map((r) => Number(r.unique_visitors) || 0),
          borderColor: "#22c55e",
          backgroundColor: "transparent",
          tension: 0.3,
          pointRadius: 2,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { position: "bottom", labels: { boxWidth: 12, padding: 14, color: "#6b7c93" } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#6b7c93" } },
        y: { beginAtZero: true, ticks: { precision: 0, color: "#6b7c93" }, grid: { color: "#eef2f7" } },
      },
    },
  });
}

function renderKpis(d) {
  const t = d.totals || {};
  const nr = d.new_vs_returning || {};
  const totalVisitors = (Number(nr.new) || 0) + (Number(nr.returning) || 0);
  const cards = [
    [STAT_ICONS.sessions, "Site sessions", fmtNum(t.sessions), ""],
    [STAT_ICONS.visitors, "Unique visitors", fmtNum(t.unique_visitors), ""],
    [STAT_ICONS.clock, "Avg. session duration", fmtSeconds(d.avg_session_duration_seconds), ""],
    [STAT_ICONS.pages, "Avg. pages / session", d.avg_pages_per_session ?? 0, ""],
    [STAT_ICONS.bounce, "Bounce rate", fmtPct(d.bounce_rate), "single page sessions"],
    [STAT_ICONS.forms, "Form submissions", fmtNum(d.form_submissions), `${fmtNum(d.contact_submissions)} contact · ${fmtNum(d.reservation_requests)} reservation`],
    [STAT_ICONS.views, "Page views", fmtNum(t.page_views), ""],
    [STAT_ICONS.growth, "New visitors", pctOf(nr.new, totalVisitors), `${fmtNum(nr.new)} new · ${fmtNum(nr.returning)} returning`, "green"],
  ];
  const el = $("[data-kpis]");
  if (el) {
    el.innerHTML = cards
      .map(([icon, label, value, sub, tone = ""]) => statCard(label, value, sub, icon, tone))
      .join("");
  }
}

async function loadDashboard() {
  try {
    const [dashboard, insights] = await Promise.all([
      api("dashboard", { days: rangeDays }),
      api("home", { days: rangeDays }),
    ]);
    renderHome(dashboard, insights);
    initHomeTabs();
  } catch (err) {
    if (err.code === 401) showLogin();
  }
}

function renderDaily(rows) {
  if (!rows.length) return void ($("[data-daily]").innerHTML = '<p class="muted">No data yet.</p>');
  const max = Math.max(...rows.map((r) => Number(r.page_views) || 0), 1);
  const ordered = [...rows].reverse();
  $("[data-daily]").innerHTML = `
    <table>
      <thead><tr><th>Day</th><th class="num">Unique</th><th class="num">Sessions</th><th class="num">Views</th><th>Volume</th></tr></thead>
      <tbody>
        ${ordered
          .map(
            (r) => `<tr>
              <td>${fmtDay(r.day)}</td>
              <td class="num">${fmtNum(r.unique_visitors)}</td>
              <td class="num">${fmtNum(r.sessions)}</td>
              <td class="num">${fmtNum(r.page_views)}</td>
              <td><div class="bar-track"><div class="bar-fill" style="width:${Math.round((Number(r.page_views) / max) * 100)}%"></div></div></td>
            </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}

function renderTopPages(rows) {
  if (!rows.length) return void ($("[data-top-pages]").innerHTML = '<p class="muted">No data yet.</p>');
  $("[data-top-pages]").innerHTML = `
    <table>
      <thead><tr><th>Path</th><th class="num">Views</th><th class="num">Unique</th><th class="num">Avg time</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (r) => `<tr>
              <td>${esc(r.path)}</td>
              <td class="num">${fmtNum(r.views)}</td>
              <td class="num">${fmtNum(r.unique_visitors)}</td>
              <td class="num">${fmtDuration(Number(r.avg_time_ms))}</td>
            </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}

function renderSources(rows) {
  if (!rows.length) return void ($("[data-sources]").innerHTML = '<p class="muted">No data yet.</p>');
  $("[data-sources]").innerHTML = `
    <table>
      <thead><tr><th>Source</th><th>Medium</th><th class="num">Sessions</th><th class="num">Unique</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (r) => `<tr>
              <td>${esc(r.source)}</td>
              <td class="muted">${esc(r.medium)}</td>
              <td class="num">${fmtNum(r.sessions)}</td>
              <td class="num">${fmtNum(r.unique_visitors)}</td>
            </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}

function renderVisitors(rows) {
  if (!rows.length) return void ($("[data-visitors]").innerHTML = '<p class="muted">No visitors yet.</p>');
  $("[data-visitors]").innerHTML = `
    <table>
      <thead><tr><th>Visitor</th><th>Device</th><th>Location</th><th class="num">Sessions</th><th class="num">Views</th><th>Last seen</th><th>Lead</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (v) => `<tr class="clickable" data-visitor="${esc(v.id)}">
              <td><span class="pill">${shortToken(v.visitor_token)}</span></td>
              <td>${esc(v.device_type)}${v.browser ? ` · ${esc(v.browser)}` : ""}</td>
              <td class="muted">${esc(v.country || "—")}</td>
              <td class="num">${fmtNum(v.total_sessions)}</td>
              <td class="num">${fmtNum(v.total_page_views)}</td>
              <td class="muted">${fmtDate(v.last_seen_at)}</td>
              <td>${v.lead_email ? esc(v.lead_email) : '<span class="muted">—</span>'}</td>
            </tr>`
          )
          .join("")}
      </tbody>
    </table>`;

  document.querySelectorAll("[data-visitor]").forEach((row) => {
    row.addEventListener("click", () => openVisitor(row.dataset.visitor));
  });
}

function eventLabel(e) {
  const href = e.metadata?.href;
  const name = e.event_name ? ` · ${esc(e.event_name)}` : "";
  return `${esc(e.event_type)}${name}${href ? ` <span class="muted">→ ${esc(href)}</span>` : ""}`;
}

function renderEvents(rows) {
  if (!rows.length) return void ($("[data-events]").innerHTML = '<p class="muted">No interactions yet.</p>');
  $("[data-events]").innerHTML = `
    <table>
      <thead><tr><th>When</th><th>Event</th><th>Page</th><th>Visitor</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (e) => `<tr>
              <td class="muted">${fmtDate(e.created_at)}</td>
              <td>${eventLabel(e)}</td>
              <td class="muted">${esc(e.path || "—")}</td>
              <td><span class="pill" data-visitor="${esc(e.visitor_id)}" style="cursor:pointer">${shortToken(e.visitor_id)}</span></td>
            </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
  document.querySelectorAll("[data-events] [data-visitor]").forEach((el) => {
    el.addEventListener("click", () => openVisitor(el.dataset.visitor));
  });
}

// ----- contacts ---------------------------------------------------------------
let contactsCache = [];

function contactName(c) {
  const name = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  return name || c.email || "Unknown";
}

function sourceLabel(sources = []) {
  if (sources.includes("contact") && sources.includes("reservation")) return "Contact + Reservation";
  if (sources.includes("reservation")) return "Reservation";
  if (sources.includes("contact")) return "Contact";
  return "—";
}

function emailStatusLabel(status) {
  if (status === "bounced") return '<span class="pill" style="color:var(--warn)">Bounced</span>';
  if (status === "unsubscribed") return '<span class="pill" style="color:var(--warn)">Unsubscribed</span>';
  return '<span class="pill" style="color:var(--good)">Active</span>';
}

function renderContactsStats(summary) {
  const el = $("[data-contacts-stats]");
  if (!el) return;
  const cards = [
    [STAT_ICONS.growth, "Total contacts", fmtNum(summary.total)],
    [STAT_ICONS.forms, "With phone", fmtNum(summary.with_phone)],
    [STAT_ICONS.forms, "Contact forms", fmtNum(summary.contact_forms)],
    [STAT_ICONS.forms, "Reservations", fmtNum(summary.reservations), "", "green"],
  ];
  el.innerHTML = cards.map(([icon, label, value, , tone]) => statCard(label, value, "", icon, tone)).join("");
}

function renderContacts(rows) {
  const mount = $("[data-contacts]");
  if (!mount) return;
  if (!rows.length) {
    mount.innerHTML = '<p class="muted">No contacts yet. Submissions from your contact and reservation forms will appear here.</p>';
    return;
  }

  mount.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Phone</th>
          <th>Source</th>
          <th>Email list</th>
          <th class="num">Forms</th>
          <th class="num">Reservations</th>
          <th>Last activity</th>
          <th>Latest note</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (c) => `<tr class="clickable" data-contact="${esc(c.id)}">
              <td><strong>${esc(contactName(c))}</strong><br><span class="pill">${esc(c.status || "new")}</span></td>
              <td>${esc(c.email || "—")}</td>
              <td>${c.phone ? esc(c.phone) : '<span class="muted">—</span>'}</td>
              <td>${esc(sourceLabel(c.sources))}</td>
              <td>${emailStatusLabel(c.email_status)}</td>
              <td class="num">${fmtNum(c.contact_submissions)}</td>
              <td class="num">${fmtNum(c.reservation_requests)}</td>
              <td class="muted">${fmtDate(c.last_activity_at)}</td>
              <td class="muted">${esc(c.last_preferred_date || c.last_message_preview || c.last_interests || "—")}</td>
            </tr>`
          )
          .join("")}
      </tbody>
    </table>`;

  mount.querySelectorAll("[data-contact]").forEach((row) => {
    row.addEventListener("click", () => openContact(row.dataset.contact));
  });
}

function filterContacts(query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return contactsCache;
  return contactsCache.filter((c) => {
    const hay = [contactName(c), c.email, c.phone, c.last_message_preview, c.last_preferred_date, c.last_interests]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

async function loadContactsSection() {
  const data = await api("contacts");
  contactsCache = data.contacts || [];
  renderContactsStats({
    total: data.total || 0,
    with_phone: data.with_phone || 0,
    contact_forms: contactsCache.reduce((n, c) => n + (c.contact_submissions || 0), 0),
    reservations: contactsCache.reduce((n, c) => n + (c.reservation_requests || 0), 0),
  });
  const search = $("[data-contacts-search]");
  renderContacts(filterContacts(search?.value));
}

function initContactsSearch() {
  const input = $("[data-contacts-search]");
  if (!input || input.dataset.bound) return;
  input.dataset.bound = "1";
  input.addEventListener("input", () => {
    renderContacts(filterContacts(input.value));
  });
}

// ----- email campaigns ------------------------------------------------------
let audienceCount = 0;

function renderCampaigns(rows) {
  if (!rows.length) {
    $("[data-campaigns]").innerHTML = '<p class="muted">No campaigns sent yet.</p>';
    return;
  }
  $("[data-campaigns]").innerHTML = `
    <table>
      <thead><tr><th>When</th><th>Subject</th><th>Flyer</th><th>Status</th><th class="num">Sent</th><th class="num">Failed</th><th class="num">Total</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (c) => `<tr>
              <td class="muted">${fmtDate(c.created_at)}</td>
              <td>${esc(c.subject)}</td>
              <td>${c.flyer_html || c.flyer_id ? '<span class="pill">Yes</span>' : '<span class="muted">—</span>'}</td>
              <td><span class="pill status-pill">${esc(c.status)}</span></td>
              <td class="num">${fmtNum(c.sent_count)}</td>
              <td class="num">${fmtNum(c.failed_count)}</td>
              <td class="num">${fmtNum(c.total_recipients)}</td>
            </tr>`
          )
          .join("")}
      </tbody>
    </table>`;
}

const MEDIA_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MEDIA_MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const MEDIA_IMAGE_ACCEPT = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);
const MEDIA_VIDEO_ACCEPT = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const MEDIA_ACCEPT = new Set([...MEDIA_IMAGE_ACCEPT, ...MEDIA_VIDEO_ACCEPT]);

let flyerEditorApi = null;
let flyerEditorsReady = null;
let mediaCache = [];
let mediaFilter = "all";
const mediaPreviewUrls = new Map();

function base64ToObjectUrl(contentType, data) {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: contentType }));
}

function rememberMediaPreviewUrl(item, url) {
  if (!item?.id || !url) return url || "";
  const prev = mediaPreviewUrls.get(item.id);
  if (prev && prev !== url && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
  mediaPreviewUrls.set(item.id, url);
  return url;
}

function ensureMediaPreviewUrl(item) {
  if (!item?.id) return "";
  const cached = mediaPreviewUrls.get(item.id);
  if (cached) return cached;
  if (item.preview_data && item.content_type) {
    return rememberMediaPreviewUrl(item, base64ToObjectUrl(item.content_type, item.preview_data));
  }
  return "";
}

function mediaDisplayUrl(item) {
  if (!item) return "";
  return ensureMediaPreviewUrl(item) || item.url || "";
}

function mediaOpenUrl(item) {
  return ensureMediaPreviewUrl(item) || item?.url || "";
}

function mediaLinkLabel(item) {
  const url = item?.url || "";
  if (url.startsWith("data:")) return "Uploaded file";
  if (url.startsWith("blob:")) return "Local preview";
  return url || "—";
}

function revokeMediaPreviewUrl(id) {
  const url = mediaPreviewUrls.get(id);
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
  mediaPreviewUrls.delete(id);
}

function fmtBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function detectUploadKind(file, requestedKind = "") {
  const kind = String(requestedKind || "").toLowerCase();
  if (kind === "logo" || kind === "video" || kind === "image") return kind;
  if (MEDIA_VIDEO_ACCEPT.has(file.type)) return "video";
  if (/logo/i.test(file.name)) return "logo";
  return "image";
}

function mediaMaxBytes(file, kind) {
  return kind === "video" || MEDIA_VIDEO_ACCEPT.has(file.type)
    ? MEDIA_MAX_VIDEO_BYTES
    : MEDIA_MAX_IMAGE_BYTES;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function ensureFlyerEditors() {
  if (!flyerEditorApi) {
    flyerEditorApi = await import("./grapes-flyer.js");
  }
  return flyerEditorApi;
}

async function uploadMediaFile(file, options = {}) {
  if (!MEDIA_ACCEPT.has(file.type)) {
    throw new Error("Use a JPG, PNG, WebP, GIF, SVG, MP4, WebM, or MOV file.");
  }
  const kind = detectUploadKind(file, options.kind);
  const maxBytes = mediaMaxBytes(file, kind);
  if (file.size > maxBytes) {
    throw new Error(`File must be under ${Math.round(maxBytes / (1024 * 1024))} MB.`);
  }
  const data = await fileToBase64(file);
  const result = await apiPost("upload_media", {
    content_type: file.type,
    data,
    filename: file.name,
    name: options.name || file.name,
    kind,
    alt_text: options.alt_text || null,
  });
  const item = result.item;
  if (item?.id) {
    rememberMediaPreviewUrl(item, URL.createObjectURL(file));
  }
  if (!item?.url && item?.id) {
    item.url = `${API_BASE}/media?id=${encodeURIComponent(item.id)}`;
  }
  return item;
}

async function fetchMediaLibrary(force = false) {
  if (mediaCache.length && !force) return mediaCache;
  const data = await api("media");
  mediaCache = data.items || [];
  return mediaCache;
}

function filteredMediaItems(items = mediaCache) {
  if (mediaFilter === "all") return items;
  return items.filter((item) => item.kind === mediaFilter);
}

const MEDIA_VIDEO_PLAY_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';

function initVideoThumbnails(root = document) {
  root.querySelectorAll(".media-thumb--video video").forEach((video) => {
    if (video.dataset.thumbBound) return;
    video.dataset.thumbBound = "1";

    const thumb = video.closest(".media-thumb");
    const markReady = () => video.classList.add("is-ready");
    const seekToPreview = () => {
      const duration = Number(video.duration);
      const target = Number.isFinite(duration) && duration > 0
        ? Math.min(0.75, Math.max(0.05, duration * 0.03))
        : 0.1;
      try {
        video.currentTime = target;
      } catch {
        markReady();
      }
    };

    video.addEventListener("seeked", markReady, { once: true });
    video.addEventListener("loadeddata", seekToPreview, { once: true });
    video.addEventListener("error", () => thumb?.classList.add("is-error"));

    if (video.readyState >= 2) seekToPreview();
    else video.load();
  });
}

function mediaPreviewHtml(item, { thumb = true } = {}) {
  const cls = thumb ? "media-thumb" : "";
  const src = esc(mediaDisplayUrl(item));
  if (item.kind === "video") {
    return `<div class="${cls} media-thumb--video">
      <video src="${src}" muted playsinline preload="auto" aria-hidden="true"></video>
      <span class="media-play-badge">${MEDIA_VIDEO_PLAY_ICON}</span>
      <span class="pill media-badge">Video</span>
    </div>`;
  }
  const badge = item.kind === "logo" ? '<span class="pill media-badge">Logo</span>' : "";
  return `<div class="${cls}"><img src="${src}" alt="${esc(item.alt_text || item.name || "Media")}" loading="lazy" />${badge}</div>`;
}

function renderMediaStats(summary) {
  const el = $("[data-media-stats]");
  if (!el) return;
  const cards = [
    [STAT_ICONS.views, "Total files", fmtNum(summary.total)],
    [STAT_ICONS.views, "Images", fmtNum(summary.images)],
    [STAT_ICONS.clock, "Videos", fmtNum(summary.videos), "", "amber"],
    [STAT_ICONS.growth, "Logos", fmtNum(summary.logos), "", "green"],
  ];
  el.innerHTML = cards.map(([icon, label, value, , tone]) => statCard(label, value, "", icon, tone)).join("");
}

function resetMediaDeleteConfirm(mount = $("[data-media-grid]")) {
  mount?.querySelectorAll("[data-media-delete][data-confirming]").forEach((btn) => {
    delete btn.dataset.confirming;
    btn.textContent = "Delete";
    btn.classList.remove("btn-delete-confirm");
  });
}

function renderMediaGrid(items) {
  const mount = $("[data-media-grid]");
  if (!mount) return;
  const rows = filteredMediaItems(items);
  if (!rows.length) {
    mount.innerHTML =
      '<p class="muted">No media yet. Upload logos, photos, or videos above — they will appear here and in the flyer editor.</p>';
    return;
  }

  mount.innerHTML = `<div class="media-grid">${rows
    .map(
      (item) => {
        const siteBadge = item.static ? '<span class="pill media-badge">Site file</span>' : "";
        return `<article class="media-card" draggable="true" data-media-id="${esc(item.id)}" data-media-url="${esc(item.url)}" data-media-kind="${esc(item.kind)}">
        ${mediaPreviewHtml(item)}
        <div class="media-meta">
          <strong>${esc(item.name || item.original_filename || "Untitled")}</strong>
          <span class="muted">${esc(item.kind)} · ${fmtBytes(item.size_bytes)} · ${fmtDate(item.created_at)} ${siteBadge}</span>
          <div class="media-actions">
            <button type="button" class="btn btn-ghost" data-media-preview="${esc(item.id)}">View</button>
            <button type="button" class="btn btn-ghost btn-delete" data-media-delete="${esc(item.id)}">Delete</button>
          </div>
        </div>
      </article>`;
      }
    )
    .join("")}</div>`;

  mount.querySelectorAll("[data-media-preview]").forEach((btn) => {
    btn.addEventListener("click", () => {
      resetMediaDeleteConfirm(mount);
      const item = mediaCache.find((m) => m.id === btn.dataset.mediaPreview);
      if (item) openMediaPreview(item);
    });
  });

  mount.querySelectorAll("[data-media-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const item = mediaCache.find((m) => m.id === btn.dataset.mediaDelete);
      if (!item) return;

      if (!btn.dataset.confirming) {
        resetMediaDeleteConfirm(mount);
        btn.dataset.confirming = "1";
        btn.textContent = "Are you sure?";
        btn.classList.add("btn-delete-confirm");
        return;
      }

      delete btn.dataset.confirming;
      btn.textContent = "Delete";
      btn.classList.remove("btn-delete-confirm");

      try {
        await apiPost("delete_media", { id: item.id });
        revokeMediaPreviewUrl(item.id);
        await loadMediaSection(true);
        await refreshFlyerMediaLibrary();
      } catch (err) {
        if (err.code === 401) return showLogin();
        alert(err.message || "Could not delete file.");
      }
    });
  });

  mount.querySelectorAll(".media-card[draggable]").forEach((card) => {
    card.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData(
        "application/x-ce-media",
        JSON.stringify({
          id: card.dataset.mediaId,
          url: card.dataset.mediaUrl,
          kind: card.dataset.mediaKind,
        })
      );
      e.dataTransfer.effectAllowed = "copy";
    });
  });

  initVideoThumbnails(mount);
}

function appendDrawerRow(dl, label, value) {
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  if (value instanceof Node) dd.appendChild(value);
  else dd.textContent = value;
  dl.appendChild(dt);
  dl.appendChild(dd);
}

function openMediaPreview(item) {
  overlay.classList.remove("hidden");
  drawer.classList.remove("hidden");
  const title = $("[data-drawer-title]");
  if (title) title.textContent = item.name || "Media preview";
  const body = $("[data-drawer-body]");
  body.replaceChildren();

  const src = mediaDisplayUrl(item);
  if (item.kind === "video") {
    const video = document.createElement("video");
    video.src = src;
    video.controls = true;
    video.style.cssText = "width:100%;border-radius:12px;background:#000";
    body.appendChild(video);
  } else {
    const img = document.createElement("img");
    img.src = src;
    img.alt = item.alt_text || item.name || "Media";
    img.style.cssText = "width:100%;border-radius:12px";
    body.appendChild(img);
  }

  const dl = document.createElement("dl");
  dl.className = "kv";
  dl.style.marginTop = "1rem";
  appendDrawerRow(dl, "Type", `${item.kind} (${item.content_type || "—"})`);
  appendDrawerRow(dl, "Size", fmtBytes(item.size_bytes));
  appendDrawerRow(
    dl,
    item.static ? "Source" : "Uploaded",
    item.static ? "Site file" : fmtDate(item.created_at)
  );

  const link = document.createElement("a");
  const openUrl = mediaOpenUrl(item);
  link.href = openUrl || "#";
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = mediaLinkLabel(item);
  link.style.wordBreak = "break-all";
  appendDrawerRow(dl, "URL", link);
  body.appendChild(dl);
}

async function refreshFlyerMediaLibrary() {
  const items = await fetchMediaLibrary(true);
  const api = await ensureFlyerEditors();
  document.querySelectorAll("[data-flyer-editor]").forEach((container) => {
    api.setFlyerAssets(container, items);
  });
  document.querySelectorAll("[data-flyer-media-strip]").forEach((strip) => {
    renderFlyerMediaStrip(strip, items);
  });
}

function renderFlyerMediaStrip(strip, items = mediaCache) {
  if (!strip) return;
  const picks = items.filter((item) => item.kind !== "video").slice(0, 12);
  if (!picks.length) {
    strip.hidden = true;
    strip.innerHTML = "";
    return;
  }
  strip.hidden = false;
  strip.innerHTML = picks
    .map(
      (item) => `<div class="media-strip-item" draggable="true" data-media-url="${esc(item.url)}" data-media-kind="${esc(item.kind)}" title="${esc(item.name || "")}">
        <img src="${esc(mediaDisplayUrl(item))}" alt="" loading="lazy" />
      </div>`
    )
    .join("");

  strip.querySelectorAll("[draggable]").forEach((el) => {
    el.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData(
        "application/x-ce-media",
        JSON.stringify({ url: el.dataset.mediaUrl, kind: el.dataset.mediaKind })
      );
      e.dataTransfer.effectAllowed = "copy";
    });
  });
}

function bindFlyerMediaDrop(container) {
  if (!container || container.dataset.mediaDropBound) return;
  container.dataset.mediaDropBound = "1";
  container.addEventListener("dragover", (e) => {
    if (!e.dataTransfer.types.includes("application/x-ce-media")) return;
    e.preventDefault();
  });
  container.addEventListener("drop", async (e) => {
    const raw = e.dataTransfer.getData("application/x-ce-media");
    if (!raw) return;
    e.preventDefault();
    try {
      const payload = JSON.parse(raw);
      const api = await ensureFlyerEditors();
      const editor = api.getFlyerEditor(container);
      if (!editor || !payload.url) return;
      if (payload.kind === "video") {
        editor.addComponents(
          `<table width="100%"><tr><td style="padding:16px;text-align:center"><a href="${esc(payload.url)}" style="display:inline-block;padding:12px 18px;background:#194055;color:#fff;text-decoration:none;border-radius:8px;font-family:system-ui,Arial,sans-serif">Watch video</a></td></tr></table>`
        );
      } else {
        editor.addComponents(
          `<table width="100%"><tr><td style="padding:0;text-align:center"><img src="${esc(payload.url)}" alt="" style="max-width:100%;height:auto;display:block;margin:0 auto" /></td></tr></table>`
        );
      }
    } catch (err) {
      console.warn("flyer media drop failed:", err);
    }
  });
}

async function uploadMediaFiles(files, statusEl, kind = "") {
  const list = Array.from(files || []);
  if (!list.length) return [];
  const uploaded = [];
  if (statusEl) statusEl.textContent = `Uploading ${list.length} file${list.length > 1 ? "s" : ""}…`;
  for (const file of list) {
    const item = await uploadMediaFile(file, { kind });
    uploaded.push(item);
  }
  return uploaded;
}

async function loadMediaSection(force = false) {
  const data = await api("media");
  mediaCache = data.items || [];
  renderMediaStats({
    total: data.total || mediaCache.length,
    images: data.images ?? mediaCache.filter((m) => m.kind === "image").length,
    videos: data.videos ?? mediaCache.filter((m) => m.kind === "video").length,
    logos: data.logos ?? mediaCache.filter((m) => m.kind === "logo").length,
  });
  renderMediaGrid(mediaCache);
  if (force) await refreshFlyerMediaLibrary();
}

function initMediaFilters() {
  const wrap = $("[data-media-filters]");
  if (!wrap || wrap.dataset.bound) return;
  wrap.dataset.bound = "1";
  wrap.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-media-kind]");
    if (!btn) return;
    mediaFilter = btn.dataset.mediaKind || "all";
    wrap.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
    renderMediaGrid(mediaCache);
  });
}

function initMediaUpload() {
  const input = $("[data-media-upload]");
  const drop = $("[data-media-drop]");
  const statusEl = $("[data-media-upload-status]");
  if (!input || input.dataset.bound) return;
  input.dataset.bound = "1";

  const handleFiles = async (files) => {
    if (!files?.length) return;
    try {
      const uploaded = await uploadMediaFiles(files, statusEl);
      if (statusEl) statusEl.textContent = `Uploaded ${uploaded.length} file${uploaded.length > 1 ? "s" : ""}.`;
      await loadMediaSection(true);
    } catch (err) {
      if (err.code === 401) return showLogin();
      if (statusEl) statusEl.textContent = err.message || "Upload failed.";
    }
  };

  input.addEventListener("change", () => {
    handleFiles(input.files);
    input.value = "";
  });

  if (drop && !drop.dataset.bound) {
    drop.dataset.bound = "1";
    ["dragenter", "dragover"].forEach((evt) => {
      drop.addEventListener(evt, (e) => {
        e.preventDefault();
        drop.classList.add("dragover");
      });
    });
    ["dragleave", "drop"].forEach((evt) => {
      drop.addEventListener(evt, (e) => {
        e.preventDefault();
        drop.classList.remove("dragover");
      });
    });
    drop.addEventListener("drop", (e) => handleFiles(e.dataTransfer.files));
  }
}

async function uploadFlyerFile(file) {
  return uploadMediaFile(file);
}

async function initTemplatePicker(root) {
  const grid = root.querySelector("[data-template-grid]");
  if (!grid || grid.dataset.ready) return;
  grid.dataset.ready = "1";

  const container = root.querySelector("[data-flyer-editor]");
  const hidden = root.querySelector('input[name="flyer_html"]');

  NEWSLETTER_TEMPLATES.forEach((t) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "template-card";
    btn.dataset.templateId = t.id;
    btn.innerHTML = `<strong>${esc(t.name)}</strong><span class="muted-desc">${esc(t.description)}</span><span class="pill">${esc(t.category)}</span>`;
    btn.addEventListener("click", async () => {
      const api = await ensureFlyerEditors();
      api.loadFlyerEditor(container, t.html, hidden);
      grid.querySelectorAll(".template-card").forEach((b) => b.classList.toggle("active", b === btn));
    });
    grid.appendChild(btn);
  });
}

async function initFlyerEditors() {
  if (flyerEditorsReady) return flyerEditorsReady;

  flyerEditorsReady = (async () => {
    const api = await ensureFlyerEditors();
    for (const root of document.querySelectorAll("[data-flyer-editor-field]")) {
      if (root.dataset.ready) continue;
      root.dataset.ready = "1";

      const container = root.querySelector("[data-flyer-editor]");
      const hidden = root.querySelector('input[name="flyer_html"]');
      const clearBtn = root.querySelector("[data-flyer-clear]");
      const statusEl = root.querySelector("[data-flyer-status]");

      await api.initFlyerEditor(container, {
        hiddenInput: hidden,
        loadAssets: fetchMediaLibrary,
        uploadFlyer: async (file) => {
          try {
            const item = await uploadMediaFile(file);
            mediaCache = [item, ...mediaCache.filter((m) => m.id !== item.id)];
            renderFlyerMediaStrip(root.querySelector("[data-flyer-media-strip]"), mediaCache);
            if (statusEl) {
              statusEl.classList.remove("error");
              statusEl.textContent = "";
            }
            return { url: item.url, item };
          } catch (err) {
            if (err.code === 401) {
              showLogin();
              throw err;
            }
            if (statusEl) {
              statusEl.classList.add("error");
              statusEl.textContent = err.message || "Upload failed.";
            }
            throw err;
          }
        },
      });

      bindFlyerMediaDrop(container);
      await fetchMediaLibrary();
      renderFlyerMediaStrip(root.querySelector("[data-flyer-media-strip]"), mediaCache);

      clearBtn?.addEventListener("click", () => {
        api.clearFlyerEditor(container, hidden);
        if (statusEl) statusEl.textContent = "";
        root.querySelector("[data-template-grid]")?.querySelectorAll(".template-card").forEach((b) => b.classList.remove("active"));
      });

      initTemplatePicker(root);
    }
  })();

  return flyerEditorsReady;
}

async function syncFlyerFields(form) {
  const api = await ensureFlyerEditors();
  form?.querySelectorAll("[data-flyer-editor]").forEach((container) => {
    const field = container.closest("[data-flyer-editor-field]");
    const hidden = field?.querySelector('input[name="flyer_html"]');
    api.syncFlyerInput(container, hidden);
  });
}

async function resetFlyerEditors(form) {
  const api = await ensureFlyerEditors();
  form?.querySelectorAll("[data-flyer-editor-field]").forEach((root) => {
    const container = root.querySelector("[data-flyer-editor]");
    const hidden = root.querySelector('input[name="flyer_html"]');
    api.clearFlyerEditor(container, hidden);
  });
}

async function loadCampaignSection() {
  try {
    const [{ count }, list, bounced, schedules] = await Promise.all([
      api("audience_count"),
      api("campaigns"),
      api("bounced_contacts"),
      api("schedules"),
    ]);
    audienceCount = count || 0;
    const el = $("[data-audience-count]");
    if (el) el.textContent = fmtNum(audienceCount);
    renderCampaigns(list);
    renderBouncedContacts(bounced);
    renderSchedules(schedules);
  } catch (err) {
    if (err.code === 401) showLogin();
  }
}

const HOUR_LABELS = {
  6: "6:00 AM",
  7: "7:00 AM",
  8: "8:00 AM",
  9: "9:00 AM",
  10: "10:00 AM",
  11: "11:00 AM",
  12: "12:00 PM",
  13: "1:00 PM",
  14: "2:00 PM",
  15: "3:00 PM",
  16: "4:00 PM",
  17: "5:00 PM",
  18: "6:00 PM",
  19: "7:00 PM",
  20: "8:00 PM",
};

function fmtHour(h) {
  return HOUR_LABELS[Number(h)] || `${h}:00`;
}

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function bindPicker(group, hiddenInput, items, defaultVal, onChange) {
  group.innerHTML = items
    .map(
      ({ value, label }) =>
        `<button type="button" data-value="${value}" role="radio" aria-checked="${value === defaultVal ? "true" : "false"}" class="${value === defaultVal ? "active" : ""}">${label}</button>`
    )
    .join("");

  group.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-value]");
    if (!btn) return;
    const val = btn.dataset.value;
    hiddenInput.value = val;
    group.querySelectorAll("button").forEach((b) => {
      const on = b.dataset.value === val;
      b.classList.toggle("active", on);
      b.setAttribute("aria-checked", on ? "true" : "false");
    });
    onChange?.(val);
  });
}

function resetPicker(group, hiddenInput, value, onChange) {
  hiddenInput.value = String(value);
  group.querySelectorAll("button").forEach((b) => {
    const on = b.dataset.value === String(value);
    b.classList.toggle("active", on);
    b.setAttribute("aria-checked", on ? "true" : "false");
  });
  onChange?.(String(value));
}

function initScheduleForm() {
  const form = $("[data-schedule-form]");
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "1";

  const dayInput = form.day_of_month;
  const hourInput = form.send_hour;
  const dayPicker = form.querySelector("[data-day-picker]");
  const hourPicker = form.querySelector("[data-hour-picker]");
  const dayHint = form.querySelector("[data-day-hint]");
  const hourHint = form.querySelector("[data-hour-hint]");

  const updateDayHint = (val) => {
    if (dayHint) dayHint.innerHTML = `Repeats on the <strong>${ordinal(Number(val))}</strong> of each month`;
  };
  const updateHourHint = (val) => {
    if (hourHint) hourHint.innerHTML = `Sends at <strong>${fmtHour(val)} ET</strong>`;
  };

  if (dayPicker && !dayPicker.dataset.ready) {
    dayPicker.dataset.ready = "1";
    bindPicker(
      dayPicker,
      dayInput,
      Array.from({ length: 31 }, (_, i) => {
        const d = i + 1;
        return { value: String(d), label: String(d) };
      }),
      "20",
      updateDayHint
    );
    updateDayHint("20");
  }

  if (hourPicker && !hourPicker.dataset.ready) {
    hourPicker.dataset.ready = "1";
    bindPicker(
      hourPicker,
      hourInput,
      Object.entries(HOUR_LABELS).map(([value, label]) => ({ value, label })),
      "9",
      updateHourHint
    );
    updateHourHint("9");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await syncFlyerFields(form);
    const statusEl = $("[data-schedule-status]");
    const btn = $("[data-schedule-save]");
    const payload = {
      name: form.name.value.trim(),
      subject: form.subject.value.trim(),
      html: form.html.value.trim(),
      day_of_month: Number(form.day_of_month.value),
      send_hour: Number(form.send_hour.value),
      flyer_html: form.flyer_html?.value.trim() || null,
    };
    if (!payload.subject || !payload.html) return;

    btn.disabled = true;
    if (statusEl) {
      statusEl.classList.remove("error");
      statusEl.style.color = "";
      statusEl.textContent = "Saving…";
    }

    try {
      await apiPost("create_schedule", payload);
      if (statusEl) statusEl.textContent = "Schedule saved.";
      form.reset();
      await resetFlyerEditors(form);
      resetPicker(dayPicker, dayInput, 20, updateDayHint);
      resetPicker(hourPicker, hourInput, 9, updateHourHint);
      panelLoaded.email = false;
      await loadCampaignSection();
    } catch (err) {
      if (err.code === 401) return showLogin();
      if (statusEl) {
        statusEl.classList.add("error");
        statusEl.textContent = err.message || "Could not save schedule.";
      }
    } finally {
      btn.disabled = false;
    }
  });
}

function renderSchedules(rows) {
  const el = $("[data-schedules]");
  if (!el) return;
  if (!rows.length) {
    el.innerHTML = '<p class="muted">No scheduled sends yet.</p>';
    return;
  }
  el.innerHTML = `
    <table>
      <thead><tr><th>Schedule</th><th>When</th><th>Next send</th><th>Last sent</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${rows
          .map(
            (s) => `<tr>
              <td>${esc(s.name || s.subject)}${s.name ? `<br><span class="muted">${esc(s.subject)}</span>` : ""}${s.flyer_html || s.flyer_id ? ' <span class="pill">Flyer</span>' : ""}</td>
              <td>Day ${esc(s.day_of_month)} · ${fmtHour(s.send_hour)} ET</td>
              <td class="muted">${esc(s.next_run || "—")}</td>
              <td class="muted">${s.last_sent_at ? fmtDate(s.last_sent_at) : "Never"}</td>
              <td><span class="pill status-pill ${s.enabled ? "" : "is-off"}">${s.enabled ? "Active" : "Paused"}</span></td>
              <td style="white-space:nowrap">
                <button class="btn btn-ghost" type="button" data-toggle-schedule="${esc(s.id)}" data-enabled="${s.enabled ? "1" : "0"}" style="padding:0.35rem 0.6rem;font-size:0.78rem">${s.enabled ? "Pause" : "Resume"}</button>
                <button class="btn btn-ghost" type="button" data-delete-schedule="${esc(s.id)}" style="padding:0.35rem 0.6rem;font-size:0.78rem">Delete</button>
              </td>
            </tr>`
          )
          .join("")}
      </tbody>
    </table>`;

  el.querySelectorAll("[data-toggle-schedule]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await apiPost("update_schedule", {
          id: btn.dataset.toggleSchedule,
          enabled: btn.dataset.enabled !== "1",
        });
        panelLoaded.email = false;
        await loadCampaignSection();
      } catch (err) {
        if (err.code === 401) showLogin();
      }
    });
  });

  el.querySelectorAll("[data-delete-schedule]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this scheduled send?")) return;
      try {
        await apiPost("delete_schedule", { id: btn.dataset.deleteSchedule });
        panelLoaded.email = false;
        await loadCampaignSection();
      } catch (err) {
        if (err.code === 401) showLogin();
      }
    });
  });
}

function renderBouncedContacts(rows) {
  const el = $("[data-bounced-contacts]");
  if (!el) return;
  if (!rows.length) {
    el.innerHTML = '<p class="muted">No flagged bounces — your list is clean.</p>';
    return;
  }
  el.innerHTML = `
    <table>
      <thead><tr><th>Email</th><th>Kind</th><th>Reason</th><th>Flagged</th><th></th></tr></thead>
      <tbody>
        ${rows
          .map(
            (r) => `<tr>
              <td>${esc(r.email)}${r.first_name ? `<br><span class="muted">${esc(r.first_name)} ${esc(r.last_name || "")}</span>` : ""}</td>
              <td><span class="pill status-pill">${esc(r.bounce_kind || "bounce")}</span></td>
              <td class="muted">${esc(r.bounce_reason || "—")}</td>
              <td class="muted">${fmtDate(r.bounced_at)}</td>
              <td><button class="btn btn-ghost" type="button" data-remove-contact="${esc(r.id)}" style="padding:0.35rem 0.7rem;font-size:0.8rem">Remove</button></td>
            </tr>`
          )
          .join("")}
      </tbody>
    </table>`;

  el.querySelectorAll("[data-remove-contact]").forEach((btn) => {
    btn.addEventListener("click", () => removeContact(btn.dataset.removeContact));
  });
}

async function removeContact(id) {
  if (!id || !confirm("Remove this contact from the database? This cannot be undone.")) return;
  const statusEl = $("[data-bounced-status]");
  try {
    await apiPost("remove_contact", { id });
    if (statusEl) {
      statusEl.classList.remove("error");
      statusEl.style.color = "";
      statusEl.textContent = "Contact removed.";
    }
    panelLoaded.email = false;
    await loadCampaignSection();
  } catch (err) {
    if (err.code === 401) return showLogin();
    if (statusEl) {
      statusEl.classList.add("error");
      statusEl.textContent = err.message || "Could not remove contact.";
    }
  }
}

function initBouncedActions() {
  const btn = $("[data-remove-all-bounced]");
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = "1";
  btn.addEventListener("click", async () => {
    if (!confirm("Remove all flagged bounced contacts from the database?")) return;
    const statusEl = $("[data-bounced-status]");
    try {
      const result = await apiPost("remove_all_bounced");
      if (statusEl) {
        statusEl.classList.remove("error");
        statusEl.style.color = "";
        statusEl.textContent = `Removed ${fmtNum(result.deleted)} contact(s).`;
      }
      panelLoaded.email = false;
      await loadCampaignSection();
    } catch (err) {
      if (err.code === 401) return showLogin();
      if (statusEl) {
        statusEl.classList.add("error");
        statusEl.textContent = err.message || "Could not remove contacts.";
      }
    }
  });
}

function initCampaignForm() {
  const form = $("[data-campaign-form]");
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "1";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    await syncFlyerFields(form);
    const statusEl = $("[data-campaign-status]");
    const btn = $("[data-campaign-send]");
    const subject = form.subject.value.trim();
    const html = form.html.value.trim();
    const flyer_html = form.flyer_html?.value.trim() || null;
    if (!subject || !html) return;

    if (!confirm(`Send this campaign to ${fmtNum(audienceCount)} contacts? This cannot be undone.`)) return;

    btn.disabled = true;
    statusEl.classList.remove("error");
    statusEl.style.color = "";
    statusEl.textContent = "Queuing…";

    try {
      await apiPost("send_campaign", { subject, html, flyer_html });
      statusEl.textContent = "Campaign queued — sending in the background.";
      form.reset();
      await resetFlyerEditors(form);
      setTimeout(loadCampaignSection, 1500);
    } catch (err) {
      if (err.code === 401) return showLogin();
      statusEl.classList.add("error");
      statusEl.textContent = err.message || "Could not send campaign.";
    } finally {
      btn.disabled = false;
    }
  });
}

// ----- visitor drawer -------------------------------------------------------
const overlay = $("[data-overlay]");
const drawer = $("[data-drawer]");

function closeDrawer() {
  overlay.classList.add("hidden");
  drawer.classList.add("hidden");
}

async function openVisitor(id) {
  overlay.classList.remove("hidden");
  drawer.classList.remove("hidden");
  const title = $("[data-drawer-title]");
  if (title) title.textContent = "Visitor activity";
  const body = $("[data-drawer-body]");
  body.innerHTML = '<div class="loading">Loading…</div>';

  try {
    const d = await api("visitor", { id });
    const v = d.visitor || {};
    const lead = v.lead || null;

    const info = `
      <dl class="kv">
        <dt>Visitor</dt><dd>${shortToken(v.visitor_token)}</dd>
        <dt>Device</dt><dd>${esc(v.device_type || "—")} · ${esc(v.browser || "—")} · ${esc(v.os || "—")}</dd>
        <dt>Location</dt><dd>${esc([v.city, v.region, v.country].filter(Boolean).join(", ") || "—")}</dd>
        <dt>First seen</dt><dd>${fmtDate(v.first_seen_at)}</dd>
        <dt>Last seen</dt><dd>${fmtDate(v.last_seen_at)}</dd>
        <dt>Totals</dt><dd>${fmtNum(v.total_sessions)} sessions · ${fmtNum(v.total_page_views)} views</dd>
        <dt>First source</dt><dd>${esc(v.first_utm_source || v.first_referrer || "direct")}</dd>
        <dt>Lead</dt><dd>${lead ? `${esc(lead.email)} <span class="pill">${esc(lead.status)}</span>` : '<span class="muted">not linked</span>'}</dd>
      </dl>`;

    const pages = d.page_views.length
      ? `<table>
          <thead><tr><th>When</th><th>Page</th><th class="num">Time on page</th></tr></thead>
          <tbody>${d.page_views
            .map(
              (p) => `<tr>
                <td class="muted">${fmtDate(p.created_at)}</td>
                <td>${esc(p.path)}${p.title ? `<br><span class="muted">${esc(p.title)}</span>` : ""}</td>
                <td class="num">${fmtDuration(Number(p.duration_ms))}</td>
              </tr>`
            )
            .join("")}</tbody>
        </table>`
      : '<p class="muted">No page views recorded.</p>';

    const events = d.events.length
      ? `<table>
          <thead><tr><th>When</th><th>Event</th><th>Page</th></tr></thead>
          <tbody>${d.events
            .map(
              (e) => `<tr>
                <td class="muted">${fmtDate(e.created_at)}</td>
                <td>${eventLabel(e)}</td>
                <td class="muted">${esc(e.path || "—")}</td>
              </tr>`
            )
            .join("")}</tbody>
        </table>`
      : '<p class="muted">No interactions recorded.</p>';

    body.innerHTML = `
      ${info}
      <div class="section-title">Pages viewed (${d.page_views.length})</div>
      ${pages}
      <div class="section-title">Clicks &amp; events (${d.events.length})</div>
      ${events}`;
  } catch (err) {
    if (err.code === 401) return showLogin();
    body.innerHTML = '<p class="muted">Could not load visitor.</p>';
  }
}

async function openContact(id) {
  overlay.classList.remove("hidden");
  drawer.classList.remove("hidden");
  const title = $("[data-drawer-title]");
  if (title) title.textContent = "Contact detail";
  const body = $("[data-drawer-body]");
  body.innerHTML = '<div class="loading">Loading…</div>';

  try {
    const d = await api("contact", { id });
    const lead = d.lead || {};
    const name = contactName({
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
    });

    const info = `
      <dl class="kv">
        <dt>Name</dt><dd>${esc(name)}</dd>
        <dt>Email</dt><dd>${esc(lead.email || "—")}</dd>
        <dt>Phone</dt><dd>${lead.phone ? esc(lead.phone) : '<span class="muted">—</span>'}</dd>
        <dt>Lead status</dt><dd><span class="pill">${esc(lead.status || "new")}</span></dd>
        <dt>Email list</dt><dd>${emailStatusLabel(lead.bounced_at ? "bounced" : lead.unsubscribed_at ? "unsubscribed" : "active")}</dd>
        <dt>First seen</dt><dd>${fmtDate(lead.first_seen_at || lead.created_at)}</dd>
        <dt>Last contact</dt><dd>${fmtDate(lead.last_contact_at)}</dd>
      </dl>`;

    const contacts = (d.contact_submissions || []).length
      ? `<table>
          <thead><tr><th>When</th><th>Message</th><th>Status</th></tr></thead>
          <tbody>${d.contact_submissions
            .map(
              (c) => `<tr>
                <td class="muted">${fmtDate(c.created_at)}</td>
                <td>${esc(c.message || "—")}</td>
                <td><span class="pill">${esc(c.status || "new")}</span></td>
              </tr>`
            )
            .join("")}</tbody>
        </table>`
      : '<p class="muted">No contact form submissions.</p>';

    const reservations = (d.reservation_requests || []).length
      ? `<table>
          <thead><tr><th>When</th><th>Session</th><th>Location</th><th>Interests</th><th>Notes</th></tr></thead>
          <tbody>${d.reservation_requests
            .map(
              (r) => `<tr>
                <td class="muted">${fmtDate(r.created_at)}</td>
                <td>${esc(r.session_time || "—")}</td>
                <td>${esc(r.launch_location || "—")}</td>
                <td>${esc((r.interests || []).join(", ") || "—")}</td>
                <td class="muted">${esc(r.preferred_date || "—")}</td>
              </tr>`
            )
            .join("")}</tbody>
        </table>`
      : '<p class="muted">No reservation requests.</p>';

    const visitors = (d.visitors || []).length
      ? `<table>
          <thead><tr><th>Visitor</th><th>Device</th><th class="num">Sessions</th><th>Last seen</th></tr></thead>
          <tbody>${d.visitors
            .map(
              (v) => `<tr class="clickable" data-visitor="${esc(v.id)}">
                <td><span class="pill">${shortToken(v.visitor_token)}</span></td>
                <td>${esc(v.device_type || "—")}${v.browser ? ` · ${esc(v.browser)}` : ""}</td>
                <td class="num">${fmtNum(v.total_sessions)}</td>
                <td class="muted">${fmtDate(v.last_seen_at)}</td>
              </tr>`
            )
            .join("")}</tbody>
        </table>`
      : '<p class="muted">No linked visitor sessions.</p>';

    body.innerHTML = `
      ${info}
      <div class="section-title">Contact form submissions (${(d.contact_submissions || []).length})</div>
      ${contacts}
      <div class="section-title">Reservation requests (${(d.reservation_requests || []).length})</div>
      ${reservations}
      <div class="section-title">Linked visitors (${(d.visitors || []).length})</div>
      ${visitors}`;

    body.querySelectorAll("[data-visitor]").forEach((row) => {
      row.addEventListener("click", () => openVisitor(row.dataset.visitor));
    });
  } catch (err) {
    if (err.code === 401) return showLogin();
    body.innerHTML = '<p class="muted">Could not load contact.</p>';
  }
}

// ----- sidebar tabs + lazy panel loading ------------------------------------
const panelLoaded = {};

function showTab(id) {
  const nav = $("[data-tabs]");
  if (!nav) return;
  activeTab = id;
  nav.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.tab === id));
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.panel !== id);
  });
  updatePageHeader(id);
  if (id === "overview") resizeHomeCharts();
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  if (location.hash !== `#${id}`) {
    history.replaceState(null, "", `#${id}`);
  }
  return loadPanel(id);
}

async function loadPanel(id) {
  if (panelLoaded[id]) return;
  panelLoaded[id] = true;

  try {
    switch (id) {
      case "overview":
        await loadDashboard();
        break;
      case "traffic":
        await Promise.all([
          api("overview").then(renderStats),
          api("daily").then(renderDaily),
          api("top_pages").then(renderTopPages),
          api("sources").then(renderSources),
        ]);
        break;
      case "visitors":
        await api("visitors", { limit: 200 }).then(renderVisitors);
        break;
      case "behavior":
        await api("events", { limit: 100 }).then(renderEvents);
        break;
      case "contacts":
        initContactsSearch();
        await loadContactsSection();
        break;
      case "media":
        initMediaFilters();
        initMediaUpload();
        await loadMediaSection();
        await refreshFlyerMediaLibrary();
        break;
      case "content":
        if (!loadContentPanel) {
          loadContentPanel = initContentPanel({
            api,
            apiPost,
            fetchMediaLibrary,
            mediaDisplayUrl,
            esc,
            fmtDate,
          });
        }
        await loadContentPanel();
        break;
      case "email":
        initCampaignForm();
        initScheduleForm();
        initBouncedActions();
        await initFlyerEditors();
        await loadCampaignSection();
        break;
    }
  } catch (err) {
    panelLoaded[id] = false;
    if (err.code === 401) showLogin();
    throw err;
  }
}

function initTabs() {
  const nav = $("[data-tabs]");
  if (!nav || nav.dataset.bound) return;
  nav.dataset.bound = "1";
  nav.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    showTab(btn.dataset.tab);
  });

  const initial = location.hash.replace("#", "") || "overview";
  const valid = ["overview", "traffic", "visitors", "behavior", "contacts", "media", "content", "email"];
  showTab(valid.includes(initial) ? initial : "overview");
}

function filterPanelTables(query) {
  const q = String(query || "").trim().toLowerCase();
  const panel = document.querySelector(`[data-panel="${activeTab}"]:not(.hidden)`);
  if (!panel) return;
  panel.querySelectorAll("tbody tr").forEach((row) => {
    if (!q) {
      row.hidden = false;
      return;
    }
    row.hidden = !row.textContent.toLowerCase().includes(q);
  });
  panel.querySelectorAll(".media-card").forEach((card) => {
    if (!q) {
      card.hidden = false;
      return;
    }
    card.hidden = !card.textContent.toLowerCase().includes(q);
  });
}

function initGlobalSearch() {
  const input = $("[data-global-search]");
  if (!input || input.dataset.bound) return;
  input.dataset.bound = "1";
  input.addEventListener("input", () => {
    const q = input.value.trim();
    if (activeTab === "contacts") {
      const contactsInput = $("[data-contacts-search]");
      if (contactsInput) {
        contactsInput.value = q;
        renderContacts(filterContacts(q));
      }
      return;
    }
    filterPanelTables(q);
  });
}

function initSidebarNavFilter() {
  const input = $("[data-nav-filter]");
  const nav = $("[data-tabs]");
  if (!input || !nav || input.dataset.bound) return;
  input.dataset.bound = "1";
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    nav.querySelectorAll("button[data-tab]").forEach((btn) => {
      const label = btn.textContent.toLowerCase();
      btn.dataset.navHidden = !q || label.includes(q) ? "0" : "1";
    });
  });
}

function initNotifications() {
  const btn = $("[data-notifications]");
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = "1";
  btn.addEventListener("click", () => {
    showTab("contacts");
    $("[data-global-search]")?.focus();
  });
}

async function refreshNotificationBadge() {
  const dot = $("[data-notif-dot]");
  if (!dot) return;
  try {
    const o = await api("overview");
    const count = Number(o.contact_submissions || 0) + Number(o.reservation_requests || 0);
    dot.classList.toggle("hidden", count <= 0);
  } catch {
    dot.classList.add("hidden");
  }
}

// ----- date-range selector --------------------------------------------------
function initRange() {
  const wrap = $("[data-range]");
  if (!wrap || wrap.dataset.bound) return;
  wrap.dataset.bound = "1";
  wrap.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-days]");
    if (!btn) return;
    rangeDays = Number(btn.dataset.days) || 30;
    wrap.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
    const title = $("[data-range-title]");
    if (title) title.textContent = `Overview · last ${rangeDays} days`;
    updatePageHeader("overview");
    loadDashboard();
  });
}

function initHomeActions() {
  $("[data-go-contacts]")?.addEventListener("click", () => showTab("contacts"));
  $("[data-home-menu]")?.addEventListener("click", () => window.open("/", "_blank"));
  document.addEventListener("admin:open-contact", (e) => {
    const id = e.detail?.id;
    if (!id) return;
    showTab("contacts").then(() => openContact(id));
  });
  document.addEventListener("home:refresh", () => loadDashboard());
}

// ----- load / auth ----------------------------------------------------------
async function loadAll() {
  initRange();
  initGlobalSearch();
  initSidebarNavFilter();
  initNotifications();
  initHomeActions();
  initTabs();
  refreshNotificationBadge();
}

function showApp() {
  gate.classList.add("hidden");
  app.classList.remove("hidden");
  if (isMockMode()) showDemoBanner();
  Object.keys(panelLoaded).forEach((k) => delete panelLoaded[k]);
  loadAll();
}

function showLogin() {
  sessionStorage.removeItem(TOKEN_KEY);
  token = "";
  Object.keys(panelLoaded).forEach((k) => delete panelLoaded[k]);
  app.classList.add("hidden");
  gate.classList.remove("hidden");
}

$("[data-login-form]").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = $("[data-login-error]");
  errEl.textContent = "";
  token = e.target.password.value;
  try {
    if (isMockMode()) {
      sessionStorage.setItem(TOKEN_KEY, token || "demo");
      showApp();
      return;
    }
    await api("overview");
    sessionStorage.setItem(TOKEN_KEY, token);
    showApp();
  } catch (err) {
    token = "";
    errEl.textContent = err.code === 401 ? "Incorrect password." : "Could not reach the server.";
  }
});

$("[data-logout]").addEventListener("click", showLogin);
$("[data-drawer-close]").addEventListener("click", closeDrawer);
overlay.addEventListener("click", closeDrawer);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDrawer();
});

// Auto-enter if a token is already stored this session, or jump straight in for demo mode.
if (isMockMode()) {
  const demoHint = $("[data-demo-hint]");
  if (demoHint) demoHint.classList.remove("hidden");
  document.querySelector('a[href="?mock=1"]')?.closest("p")?.classList.add("hidden");
  if (token) showApp();
  else showLogin();
} else if (token) {
  showApp();
} else {
  showLogin();
}
