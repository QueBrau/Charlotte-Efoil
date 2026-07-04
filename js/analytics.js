// =============================================================================
// CharlotteEfoil — lightweight first-party visitor analytics
// Tracks unique visitors, sessions, page views, and interaction events, then
// ships them to /api/track. No third-party scripts, no cookies — identifiers
// live in localStorage (visitor) and sessionStorage (session).
// =============================================================================

const API_BASE = window.CE_API_BASE || "/api";
const VISITOR_KEY = "ce_visitor";
const SESSION_KEY = "ce_session";
const SESSION_META_KEY = "ce_session_meta";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity = new session

let queue = [];
let flushTimer = null;
let started = false;

// Time-on-page tracking for the current page view.
let currentView = null; // { id, path, accumulatedMs, visibleSince }
let durationSent = false;

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function safeGet(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch {
    /* private mode / disabled storage — tracking simply no-ops */
  }
}

function getVisitorToken() {
  let token = safeGet(localStorage, VISITOR_KEY);
  if (!token) {
    token = uuid();
    safeSet(localStorage, VISITOR_KEY, token);
  }
  return token;
}

function getSessionToken() {
  const now = Date.now();
  const last = Number(safeGet(sessionStorage, SESSION_KEY + "_ts")) || 0;
  let token = safeGet(sessionStorage, SESSION_KEY);

  if (!token || now - last > SESSION_TIMEOUT_MS) {
    token = uuid();
    safeSet(sessionStorage, SESSION_KEY, token);
    captureSessionMeta();
  }
  safeSet(sessionStorage, SESSION_KEY + "_ts", String(now));
  return token;
}

function captureSessionMeta() {
  const params = new URLSearchParams(window.location.search);
  const meta = {
    referrer: document.referrer || "",
    landing_path: window.location.pathname + window.location.search,
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    utm_term: params.get("utm_term") || "",
    utm_content: params.get("utm_content") || "",
  };
  safeSet(sessionStorage, SESSION_META_KEY, JSON.stringify(meta));
}

function getSessionMeta() {
  try {
    return JSON.parse(safeGet(sessionStorage, SESSION_META_KEY) || "{}");
  } catch {
    return {};
  }
}

function detectDevice() {
  const ua = navigator.userAgent || "";
  if (/bot|crawler|spider|crawling/i.test(ua)) return "bot";
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)))
    return "tablet";
  if (/Mobi|iPhone|iPod|Android.*Mobile/i.test(ua)) return "mobile";
  return "desktop";
}

function detectBrowser() {
  const ua = navigator.userAgent || "";
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  return "Other";
}

function detectOs() {
  const ua = navigator.userAgent || "";
  if (/Windows/i.test(ua)) return "Windows";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Mac OS X/i.test(ua)) return "macOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Linux/i.test(ua)) return "Linux";
  return "Other";
}

function buildPayload(events) {
  const meta = getSessionMeta();
  return {
    visitor_token: getVisitorToken(),
    session_token: getSessionToken(),
    device_type: detectDevice(),
    browser: detectBrowser(),
    os: detectOs(),
    ...meta,
    events,
  };
}

function send(events, { beacon = false } = {}) {
  if (!events.length) return;
  const payload = buildPayload(events);
  const url = `${API_BASE}/track`;

  // Send as text/plain to keep sendBeacon (and fetch) on the CORS-safe path.
  const bodyText = JSON.stringify(payload);

  if (beacon && navigator.sendBeacon) {
    const blob = new Blob([bodyText], { type: "text/plain" });
    navigator.sendBeacon(url, blob);
    return;
  }

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: bodyText,
    keepalive: true,
  }).catch(() => {});
}

function flush({ beacon = false } = {}) {
  if (!queue.length) return;
  const batch = queue;
  queue = [];
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  send(batch, { beacon });
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => flush(), 4000);
}

/** Public: record a custom event (queued, batched). */
export function trackEvent(type, name, metadata = {}) {
  queue.push({
    type,
    name: name || null,
    path: window.location.pathname,
    metadata,
    ts: new Date().toISOString(),
  });
  scheduleFlush();
}

function trackPageView() {
  const viewId = uuid();
  currentView = {
    id: viewId,
    path: window.location.pathname,
    accumulatedMs: 0,
    visibleSince: document.visibilityState === "visible" ? performance.now() : null,
  };
  durationSent = false;

  // Page views are sent right away so they aren't lost if the visitor bounces.
  send([
    {
      type: "pageview",
      path: window.location.pathname,
      title: document.title,
      referrer: document.referrer || "",
      client_view_id: viewId,
      ts: new Date().toISOString(),
    },
  ]);
}

/** Total engaged (visible) time on the current page, in milliseconds. */
function currentDurationMs() {
  if (!currentView) return 0;
  let total = currentView.accumulatedMs;
  if (currentView.visibleSince != null) {
    total += performance.now() - currentView.visibleSince;
  }
  return Math.round(total);
}

function pauseTimer() {
  if (currentView && currentView.visibleSince != null) {
    currentView.accumulatedMs += performance.now() - currentView.visibleSince;
    currentView.visibleSince = null;
  }
}

function resumeTimer() {
  if (currentView && currentView.visibleSince == null) {
    currentView.visibleSince = performance.now();
  }
}

function sendDuration({ beacon = false } = {}) {
  if (!currentView) return;
  const duration = currentDurationMs();
  if (duration < 500) return; // ignore trivial glances
  send(
    [
      {
        type: "page_duration",
        path: currentView.path,
        client_view_id: currentView.id,
        duration_ms: duration,
        ts: new Date().toISOString(),
      },
    ],
    { beacon }
  );
  durationSent = true;
}

function attachAutoEvents() {
  document.addEventListener(
    "click",
    (event) => {
      const link = event.target.closest("a");
      if (!link) return;
      const href = link.getAttribute("href") || "";

      if (href.startsWith("tel:")) {
        trackEvent("phone_click", "call", { href });
      } else if (href.startsWith("mailto:")) {
        trackEvent("email_click", "email", { href });
      } else if (/instagram\.com/i.test(href)) {
        trackEvent("social_click", "instagram", { href });
      } else if (/reservation-request/i.test(href)) {
        trackEvent("cta_click", "request_reservation", { href });
      }

      const tracked = link.dataset.track || link.closest("[data-track]")?.dataset.track;
      if (tracked) trackEvent("cta_click", tracked, { href });
    },
    { passive: true }
  );

  // Flush reliably when the page is hidden or unloaded, including time-on-page.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      pauseTimer();
      sendDuration({ beacon: true });
      flush({ beacon: true });
    } else {
      resumeTimer();
    }
  });
  window.addEventListener("pagehide", () => {
    pauseTimer();
    sendDuration({ beacon: true });
    flush({ beacon: true });
  });
}

export function initAnalytics() {
  if (started) return;
  started = true;
  // Prime tokens (creates visitor/session on first run).
  getVisitorToken();
  getSessionToken();
  trackPageView();
  attachAutoEvents();
}
