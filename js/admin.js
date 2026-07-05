// =============================================================================
// CharlotteEfoil — admin analytics dashboard
// Password-gated client for the /api/admin endpoint. The password is held only
// in sessionStorage and sent as a bearer token; all data stays server-side.
// =============================================================================

import Chart from "chart.js/auto";

Chart.defaults.color = "#93a7b0";
Chart.defaults.borderColor = "rgba(255, 255, 255, 0.08)";
Chart.defaults.font.family =
  'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

const API_BASE = window.CE_API_BASE || "/api";
const TOKEN_KEY = "ce_admin_token";
const PALETTE = ["#4fb0d4", "#46c78f", "#e8b04b", "#b57edc", "#e87b7b", "#7bc4e8", "#9ad46f"];

let rangeDays = 30;
const charts = {};

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

async function apiPost(action, body = {}) {
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
    boxWidth: 12,
    padding: 14,
    generateLabels(chart) {
      const ds = chart.data.datasets[0];
      const total = ds.data.reduce((a, b) => a + Number(b), 0) || 1;
      return chart.data.labels.map((label, i) => ({
        text: `${label} — ${Math.round((Number(ds.data[i]) / total) * 100)}%`,
        fillStyle: ds.backgroundColor[i],
        strokeStyle: ds.backgroundColor[i],
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
          borderColor: "#142027",
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
          borderColor: "#4fb0d4",
          backgroundColor: "rgba(79, 176, 212, 0.16)",
          fill: true,
          tension: 0.3,
          pointRadius: 2,
          borderWidth: 2,
        },
        {
          label: "Unique visitors",
          data: rows.map((r) => Number(r.unique_visitors) || 0),
          borderColor: "#46c78f",
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
      plugins: { legend: { position: "bottom", labels: { boxWidth: 12, padding: 14 } } },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { precision: 0 } },
      },
    },
  });
}

function renderKpis(d) {
  const t = d.totals || {};
  const nr = d.new_vs_returning || {};
  const totalVisitors = (Number(nr.new) || 0) + (Number(nr.returning) || 0);
  const cards = [
    ["Site sessions", fmtNum(t.sessions), ""],
    ["Unique visitors", fmtNum(t.unique_visitors), ""],
    ["Avg. session duration", fmtSeconds(d.avg_session_duration_seconds), ""],
    ["Avg. pages / session", d.avg_pages_per_session ?? 0, ""],
    ["Bounce rate", fmtPct(d.bounce_rate), "single-page sessions"],
    ["Form submissions", fmtNum(d.form_submissions), `${fmtNum(d.contact_submissions)} contact · ${fmtNum(d.reservation_requests)} reservation`],
    ["Page views", fmtNum(t.page_views), ""],
    ["New visitors", pctOf(nr.new, totalVisitors), `${fmtNum(nr.new)} new · ${fmtNum(nr.returning)} returning`],
  ];
  const el = $("[data-kpis]");
  if (el) {
    el.innerHTML = cards
      .map(
        ([label, value, sub]) =>
          `<div class="stat"><div class="label">${label}</div><div class="value">${value}</div>${
            sub ? `<div class="sub">${sub}</div>` : ""
          }</div>`
      )
      .join("");
  }
}

async function loadDashboard() {
  try {
    const d = await api("dashboard", { days: rangeDays });
    renderKpis(d);
    drawSessions(boxes.sessions, "sessions", d.sessions_over_time || []);
    drawDoughnut(boxes.newret, "newret", [
      { label: "New", value: d.new_vs_returning?.new },
      { label: "Returning", value: d.new_vs_returning?.returning },
    ]);
    drawDoughnut(
      boxes.device,
      "device",
      (d.sessions_by_device || []).map((x) => ({ label: cap(x.label), value: Number(x.sessions) }))
    );
    drawDoughnut(
      boxes.channels,
      "channels",
      (d.channels || []).map((x) => ({ label: x.label, value: Number(x.sessions) }))
    );
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

// ----- email campaigns ------------------------------------------------------
let audienceCount = 0;

function renderCampaigns(rows) {
  if (!rows.length) {
    $("[data-campaigns]").innerHTML = '<p class="muted">No campaigns sent yet.</p>';
    return;
  }
  $("[data-campaigns]").innerHTML = `
    <table>
      <thead><tr><th>When</th><th>Subject</th><th>Status</th><th class="num">Sent</th><th class="num">Failed</th><th class="num">Total</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (c) => `<tr>
              <td class="muted">${fmtDate(c.created_at)}</td>
              <td>${esc(c.subject)}</td>
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

async function loadCampaignSection() {
  try {
    const [{ count }, list] = await Promise.all([api("audience_count"), api("campaigns")]);
    audienceCount = count || 0;
    const el = $("[data-audience-count]");
    if (el) el.textContent = fmtNum(audienceCount);
    renderCampaigns(list);
  } catch (err) {
    if (err.code === 401) showLogin();
  }
}

function initCampaignForm() {
  const form = $("[data-campaign-form]");
  if (!form || form.dataset.bound) return;
  form.dataset.bound = "1";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const statusEl = $("[data-campaign-status]");
    const btn = $("[data-campaign-send]");
    const subject = form.subject.value.trim();
    const html = form.html.value.trim();
    if (!subject || !html) return;

    if (!confirm(`Send this campaign to ${fmtNum(audienceCount)} contacts? This cannot be undone.`)) return;

    btn.disabled = true;
    statusEl.classList.remove("error");
    statusEl.style.color = "";
    statusEl.textContent = "Queuing…";

    try {
      await apiPost("send_campaign", { subject, html });
      statusEl.textContent = "Campaign queued — sending in the background.";
      form.reset();
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

// ----- sidebar tabs + lazy panel loading ------------------------------------
const panelLoaded = {};

function showTab(id) {
  const nav = $("[data-tabs]");
  if (!nav) return;
  nav.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.tab === id));
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.classList.toggle("hidden", panel.dataset.panel !== id);
  });
  if (id === "overview") Object.values(charts).forEach((c) => c?.resize());
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
      case "email":
        initCampaignForm();
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
  const valid = ["overview", "traffic", "visitors", "behavior", "email"];
  showTab(valid.includes(initial) ? initial : "overview");
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
    loadDashboard();
  });
}

// ----- load / auth ----------------------------------------------------------
async function loadAll() {
  initRange();
  initTabs();
}

$("[data-refresh]").addEventListener("click", async () => {
  const active = document.querySelector("[data-tabs] button.active")?.dataset.tab || "overview";
  panelLoaded[active] = false;
  try {
    await loadPanel(active);
  } catch {
    /* auth handled in loadPanel */
  }
});

function showApp() {
  gate.classList.add("hidden");
  app.classList.remove("hidden");
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

// Auto-enter if a token is already stored this session.
if (token) {
  showApp();
} else {
  showLogin();
}
