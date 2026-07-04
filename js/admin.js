// =============================================================================
// CharlotteEfoil — admin analytics dashboard
// Password-gated client for the /api/admin endpoint. The password is held only
// in sessionStorage and sent as a bearer token; all data stays server-side.
// =============================================================================

const API_BASE = window.CE_API_BASE || "/api";
const TOKEN_KEY = "ce_admin_token";

const $ = (sel) => document.querySelector(sel);
const gate = $("[data-gate]");
const app = $("[data-app]");

let token = sessionStorage.getItem(TOKEN_KEY) || "";

async function api(action, params = {}) {
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

// ----- renderers ------------------------------------------------------------
function renderStats(o) {
  const cards = [
    ["Unique visitors", fmtNum(o.unique_visitors)],
    ["Sessions", fmtNum(o.sessions)],
    ["Page views", fmtNum(o.page_views)],
    ["Pages / session", o.pages_per_session ?? 0],
    ["Interactions", fmtNum(o.events)],
    ["Leads", fmtNum(o.leads)],
    ["Contact forms", fmtNum(o.contact_submissions)],
    ["Reservations", fmtNum(o.reservation_requests)],
  ];
  $("[data-stats]").innerHTML = cards
    .map(
      ([label, value]) =>
        `<div class="stat"><div class="label">${label}</div><div class="value">${value}</div></div>`
    )
    .join("");
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

// ----- load / auth ----------------------------------------------------------
async function loadAll() {
  const results = await Promise.allSettled([
    api("overview").then(renderStats),
    api("daily").then(renderDaily),
    api("top_pages").then(renderTopPages),
    api("sources").then(renderSources),
    api("visitors", { limit: 200 }).then(renderVisitors),
    api("events", { limit: 100 }).then(renderEvents),
  ]);
  const unauthorized = results.find((r) => r.status === "rejected" && r.reason?.code === 401);
  if (unauthorized) showLogin();
}

function showApp() {
  gate.classList.add("hidden");
  app.classList.remove("hidden");
  loadAll();
}

function showLogin() {
  sessionStorage.removeItem(TOKEN_KEY);
  token = "";
  app.classList.add("hidden");
  gate.classList.remove("hidden");
}

$("[data-login-form]").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = $("[data-login-error]");
  errEl.textContent = "";
  token = e.target.password.value;
  try {
    await api("overview");
    sessionStorage.setItem(TOKEN_KEY, token);
    showApp();
  } catch (err) {
    token = "";
    errEl.textContent = err.code === 401 ? "Incorrect password." : "Could not reach the server.";
  }
});

$("[data-refresh]").addEventListener("click", loadAll);
$("[data-logout]").addEventListener("click", showLogin);
$("[data-drawer-close]").addEventListener("click", closeDrawer);
overlay.addEventListener("click", closeDrawer);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDrawer();
});

// Auto-enter if a token is already stored this session.
if (token) {
  showApp();
} else {
  showLogin();
}
