// Shared HTTP helpers for the CharlotteEfoil Netlify Functions.

function corsHeaders() {
  const allowed = Netlify.env.get("ALLOWED_ORIGIN") || "*";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

export function noContent() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export function preflight() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

/**
 * Parses a request body that may arrive as JSON (fetch) or text/plain
 * (navigator.sendBeacon, which we send as a plain-text blob to avoid a CORS
 * preflight). Returns {} on any parse failure.
 */
export async function readBody(req) {
  try {
    const text = await req.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/** SHA-256 hex digest of value + salt — used to store IPs without keeping PII. */
export async function hashIp(ip) {
  if (!ip) return null;
  const salt = Netlify.env.get("TRACKING_IP_SALT") || "charlotte-efoil";
  const data = new TextEncoder().encode(`${ip}:${salt}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return typeof value === "string" && EMAIL_RE.test(value.trim());
}

/** Trims and caps string length so a single submission can't bloat the DB. */
export function clean(value, max = 2000) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

/**
 * Honeypot check. The forms include a hidden field named `company`; real users
 * never fill it, bots usually do. Returns true if this looks like spam.
 */
export function isSpam(body) {
  return Boolean(clean(body?.company, 200));
}
