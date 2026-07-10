import Chart from "chart.js/auto";

const HOME_ICONS = {
  sessions:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 14l3-3 3 2 5-6"/></svg>',
  visitors:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  submissions:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" aria-hidden="true"><path d="M3 11v3a1 1 0 0 0 1 1h2l4 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M16 8a5 5 0 0 1 0 8"/><path d="M19 5a9 9 0 0 1 0 14"/></svg>',
  engagement:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="2.5"/></svg>',
};

const HOME_CHANNELS = [
  { id: "all", label: "All traffic" },
  { id: "Organic search", label: "Organic" },
  { id: "Direct", label: "Direct" },
  { id: "Marketing", label: "Marketing" },
  { id: "Referral", label: "Referral" },
];

const TREND_UP_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 14l5-5 5 5"/><path d="M12 19V9"/></svg>';
const TREND_DOWN_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M7 10l5 5 5-5"/><path d="M12 5v10"/></svg>';
const CHEVRON_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

let homeChannel = "all";
let homeCharts = {};
let homeData = { dashboard: null, insights: null };

function $(sel, root = document) {
  return root.querySelector(sel);
}

function fmtNum(n) {
  return (n ?? 0).toLocaleString();
}

function fmtPct(ratio) {
  return `${((Number(ratio) || 0) * 100).toFixed(1)}%`;
}

function fmtDateShort(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function initials(name) {
  const parts = String(name || "?").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "?";
}

function channelMetrics(dashboard, channel) {
  const t = dashboard?.totals || {};
  if (channel === "all") {
    return {
      sessions: t.sessions || 0,
      visitors: t.unique_visitors || 0,
      submissions: dashboard?.form_submissions || 0,
      engagement: 1 - (Number(dashboard?.bounce_rate) || 0),
    };
  }
  const row = (dashboard?.channels || []).find((c) => c.label === channel);
  const sessions = Number(row?.sessions) || 0;
  const visitors = Number(row?.unique_visitors) || 0;
  const totalSessions = Number(t.sessions) || 1;
  const share = sessions / totalSessions;
  return {
    sessions,
    visitors,
    submissions: Math.round((Number(dashboard?.form_submissions) || 0) * share),
    engagement: Math.max(0.15, 1 - (Number(dashboard?.bounce_rate) || 0) * (channel === "Direct" ? 1.1 : 0.9)),
  };
}

function metricCard(label, value, icon, tone = "blue") {
  return `<article class="home-metric tone-${tone}">
    <div class="home-metric-icon">${icon}</div>
    <div class="home-metric-body">
      <span class="home-metric-label">${label}</span>
      <strong class="home-metric-value">${value}</strong>
    </div>
  </article>`;
}

function renderHomeKpis(dashboard) {
  const m = channelMetrics(dashboard, homeChannel);
  const mount = $("[data-home-kpis]");
  if (!mount) return;
  mount.innerHTML = [
    metricCard("Total sessions", fmtNum(m.sessions), HOME_ICONS.sessions, "blue"),
    metricCard("Unique visitors", fmtNum(m.visitors), HOME_ICONS.visitors, "violet"),
    metricCard("Form submissions", fmtNum(m.submissions), HOME_ICONS.submissions, "amber"),
    metricCard("Engagement", fmtPct(m.engagement), HOME_ICONS.engagement, "green"),
  ].join("");
}

function periodLabel(days) {
  if (days === 7) return "Last 7 days";
  if (days === 90) return "Last 90 days";
  return "Last 30 days";
}

function avgLabel(days) {
  return days >= 60 ? "Avg per month" : "Avg per day";
}

function fmtBucketLabel(dayIso) {
  const d = new Date(dayIso);
  if (Number.isNaN(d.getTime())) return String(dayIso || "");
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function bucketTimeSeries(rows, buckets = 6) {
  if (!rows?.length) return { labels: [], sessions: [], visitors: [] };
  if (rows.length <= buckets) {
    return {
      labels: rows.map((r) => fmtBucketLabel(r.day)),
      sessions: rows.map((r) => Number(r.sessions) || 0),
      visitors: rows.map((r) => Number(r.unique_visitors) || 0),
    };
  }
  const size = Math.ceil(rows.length / buckets);
  const labels = [];
  const sessions = [];
  const visitors = [];
  for (let i = 0; i < rows.length; i += size) {
    const chunk = rows.slice(i, i + size);
    labels.push(fmtBucketLabel(chunk[0].day));
    sessions.push(chunk.reduce((sum, r) => sum + (Number(r.sessions) || 0), 0));
    visitors.push(chunk.reduce((sum, r) => sum + (Number(r.unique_visitors) || 0), 0));
  }
  return { labels, sessions, visitors };
}

function trendPct(values) {
  if (!values.length) return { pct: 0, up: true };
  const mid = Math.max(1, Math.floor(values.length / 2));
  const first = values.slice(0, mid);
  const second = values.slice(mid);
  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
  const a = avg(first);
  const b = avg(second);
  if (a === 0) return { pct: b > 0 ? 100 : 0, up: b >= a };
  const pct = ((b - a) / a) * 100;
  return { pct: Math.abs(pct), up: pct >= 0 };
}

function channelShare(dashboard, channel) {
  if (channel === "all") return 1;
  const total = Number(dashboard?.totals?.sessions) || 1;
  const row = (dashboard?.channels || []).find((c) => c.label === channel);
  return (Number(row?.sessions) || 0) / total;
}

function sessionsSeries(dashboard, channel) {
  const share = channelShare(dashboard, channel);
  return (dashboard?.sessions_over_time || []).map((r) => ({
    day: r.day,
    sessions: Math.round((Number(r.sessions) || 0) * share),
    unique_visitors: Math.round((Number(r.unique_visitors) || 0) * share),
  }));
}

function renderTrafficCard(dashboard) {
  const mount = $("[data-home-traffic]");
  if (!mount) return;

  const rangeDays = Number(dashboard?.range_days) || 30;
  const rows = sessionsSeries(dashboard, homeChannel);
  const series = bucketTimeSeries(rows, 6);
  const totalSessions = rows.reduce((sum, r) => sum + (Number(r.sessions) || 0), 0);
  const divisor = rangeDays >= 60 ? Math.max(1, rangeDays / 30) : Math.max(1, rows.length);
  const avgValue = totalSessions / divisor;
  const trend = trendPct(series.sessions);
  const trendClass = trend.up ? "up" : "down";
  const trendIcon = trend.up ? TREND_UP_ICON : TREND_DOWN_ICON;

  mount.innerHTML = `
    <div class="traffic-chart-head">
      <h3>Sessions</h3>
      <span class="traffic-chart-period">${periodLabel(rangeDays)}${CHEVRON_ICON}</span>
    </div>
    <div class="traffic-chart-summary">
      <div class="traffic-chart-stat">
        <strong class="traffic-chart-value">${fmtNum(Math.round(avgValue))}</strong>
        <span class="trend-badge ${trendClass}">${trendIcon}${trend.pct.toFixed(2)}%</span>
      </div>
      <span class="muted traffic-chart-sub">${avgLabel(rangeDays)}</span>
    </div>
    <div class="traffic-chart-box">
      <canvas data-home-traffic-chart></canvas>
    </div>`;

  drawTrafficChart(series);
}

function drawTrafficChart(series) {
  const canvas = $("[data-home-traffic-chart]");
  const box = canvas?.parentElement;
  if (!box) return;

  if (!series.labels.length) {
    destroyHomeChart("traffic");
    box.innerHTML = '<div class="traffic-chart-empty">No session data yet.</div>';
    return;
  }

  if (!box.querySelector("canvas")) {
    box.innerHTML = '<canvas data-home-traffic-chart></canvas>';
  }

  const c = $("[data-home-traffic-chart]");
  destroyHomeChart("traffic");

  homeCharts.traffic = new Chart(c, {
    type: "line",
    data: {
      labels: series.labels,
      datasets: [
        {
          label: "Sessions",
          data: series.sessions,
          borderColor: "#4f7df3",
          backgroundColor: "rgba(79, 125, 243, 0.14)",
          fill: true,
          tension: 0.42,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2.5,
        },
        {
          label: "Visitors",
          data: series.visitors,
          borderColor: "#94a3b8",
          backgroundColor: "transparent",
          fill: false,
          tension: 0.42,
          pointRadius: 0,
          pointHoverRadius: 4,
          borderWidth: 2,
          borderDash: [6, 5],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "bottom",
          align: "center",
          labels: {
            color: "#6b7c93",
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            pointStyle: "circle",
            padding: 18,
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${fmtNum(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: "#94a3b8", font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          border: { display: false },
          ticks: {
            color: "#94a3b8",
            font: { size: 11 },
            precision: 0,
            maxTicksLimit: 5,
          },
          grid: { color: "#eef2f7", drawBorder: false },
        },
      },
    },
  });
}

function renderContactsTable(insights) {
  const mount = $("[data-home-contacts]");
  if (!mount) return;
  const rows = insights?.contacts || [];
  if (!rows.length) {
    mount.innerHTML = '<p class="muted">No contacts yet.</p>';
    return;
  }
  mount.innerHTML = `
    <table class="home-table">
      <thead><tr><th>Name</th><th class="num">Submissions</th><th>Contact</th></tr></thead>
      <tbody>
        ${rows
          .map(
            (c) => `<tr class="clickable" data-home-contact="${esc(c.id)}">
              <td><div class="person-cell"><span class="avatar">${esc(initials(c.name))}</span><span class="person-name" title="${esc(c.name)}">${esc(c.name)}</span></div></td>
              <td class="num">${fmtNum(c.projects)}</td>
              <td class="muted contact-cell" title="${esc(c.follower || "")}">${esc(c.follower || "—")}</td>
            </tr>`
          )
          .join("")}
      </tbody>
    </table>`;

  mount.querySelectorAll("[data-home-contact]").forEach((row) => {
    row.addEventListener("click", () => {
      document.dispatchEvent(new CustomEvent("admin:open-contact", { detail: { id: row.dataset.homeContact } }));
    });
  });
}

function destroyHomeChart(key) {
  if (homeCharts[key]) {
    homeCharts[key].destroy();
    delete homeCharts[key];
  }
}

function drawDeviceChart(insights) {
  const canvas = $("[data-home-device-chart]");
  const box = canvas?.parentElement;
  if (!canvas || !box) return;
  const devices = (insights?.devices || []).filter((d) => d.label !== "unknown");
  if (!devices.length) {
    destroyHomeChart("device");
    box.innerHTML = '<div class="chart-empty">No device data yet.</div>';
    return;
  }
  if (!box.querySelector("canvas")) {
    box.innerHTML = '<canvas data-home-device-chart></canvas>';
  }
  const c = $("[data-home-device-chart]");
  destroyHomeChart("device");
  homeCharts.device = new Chart(c, {
    type: "bar",
    data: {
      labels: devices.map((d) => d.label.charAt(0).toUpperCase() + d.label.slice(1)),
      datasets: [
        {
          label: "New",
          data: devices.map((d) => -Math.abs(d.new)),
          backgroundColor: "#4f7df3",
          borderRadius: 6,
        },
        {
          label: "Returning",
          data: devices.map((d) => d.returning),
          backgroundColor: "#22c55e",
          borderRadius: 6,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          stacked: true,
          ticks: {
            callback: (v) => Math.abs(v),
            color: "#6b7c93",
          },
          grid: { color: "#eef2f7" },
        },
        y: {
          stacked: true,
          ticks: { color: "#6b7c93" },
          grid: { display: false },
        },
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#6b7c93", boxWidth: 12 },
        },
      },
    },
  });
}

function drawRadarChart(insights, dashboard) {
  const canvas = $("[data-home-radar-chart]");
  const box = canvas?.parentElement;
  if (!canvas || !box) return;
  if (!box.querySelector("canvas")) {
    box.innerHTML = '<canvas data-home-radar-chart></canvas>';
  }
  const c = $("[data-home-radar-chart]");
  destroyHomeChart("radar");

  const labels = insights?.radar?.labels || ["Lessons", "Demos", "Corporate", "Family", "Contact", "Reservations"];
  const base = insights?.radar?.values || labels.map(() => 0);
  const channels = (dashboard?.channels || []).slice(0, 3);
  const palette = ["#f59e0b", "#22c55e", "#4f7df3"];

  const datasets =
    channels.length > 0
      ? channels.map((ch, i) => ({
          label: ch.label,
          data: base.map((v, idx) => Math.round(v * ((ch.sessions || 1) / (dashboard?.totals?.sessions || 1)) * (0.7 + idx * 0.05))),
          borderColor: palette[i % palette.length],
          backgroundColor: `${palette[i % palette.length]}22`,
          borderWidth: 2,
          pointRadius: 2,
        }))
      : [
          {
            label: "Engagement",
            data: base,
            borderColor: "#4f7df3",
            backgroundColor: "rgba(79,125,243,0.15)",
            borderWidth: 2,
            pointRadius: 2,
          },
        ];

  homeCharts.radar = new Chart(c, {
    type: "radar",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          angleLines: { color: "#e6ebf2" },
          grid: { color: "#e6ebf2" },
          pointLabels: { color: "#6b7c93", font: { size: 11 } },
          ticks: { display: false },
        },
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#6b7c93", boxWidth: 12 },
        },
      },
    },
  });
}

export function renderHome(dashboard, insights) {
  homeData = { dashboard, insights };
  renderHomeKpis(dashboard);
  renderTrafficCard(dashboard);
  renderContactsTable(insights);
  drawDeviceChart(insights);
  drawRadarChart(insights, dashboard);

  const since = $("[data-home-since]");
  if (since && insights?.tracking_since) {
    since.textContent = fmtDateShort(insights.tracking_since);
  }
}

export function initHomeTabs(onChange) {
  const wrap = $("[data-home-channels]");
  if (!wrap || wrap.dataset.bound) return;
  wrap.dataset.bound = "1";
  wrap.innerHTML = HOME_CHANNELS.map(
    (ch, i) =>
      `<button type="button" class="${i === 0 ? "active" : ""}" data-home-channel="${esc(ch.id)}">${esc(ch.label)}</button>`
  ).join("");
  wrap.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-home-channel]");
    if (!btn) return;
    homeChannel = btn.dataset.homeChannel || "all";
    wrap.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
    if (homeData.dashboard) {
      renderHomeKpis(homeData.dashboard);
      renderTrafficCard(homeData.dashboard);
    }
    onChange?.(homeChannel);
  });
}

export function getHomeChannel() {
  return homeChannel;
}

export function resizeHomeCharts() {
  Object.values(homeCharts).forEach((c) => c?.resize());
}

export function destroyHomeCharts() {
  Object.keys(homeCharts).forEach(destroyHomeChart);
}
