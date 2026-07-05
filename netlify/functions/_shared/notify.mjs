// Email notifications via Amazon SES. Configure with SES_REGION,
// SES_ACCESS_KEY_ID, SES_SECRET_ACCESS_KEY, SES_FROM_EMAIL, and NOTIFY_EMAIL.
// If SES is not configured, sending is skipped silently so submissions still
// succeed.

import { sendEmail, sesConfigured } from "./ses.mjs";

function esc(s) {
  return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

const INTEREST_LABELS = {
  lesson: "One-on-one / 2-rider private session",
  demo: "Lift eFoil purchase demonstration",
  corporate: "Corporate event / team building",
  family: "Family gathering or outing",
};

/** Sends a formatted reservation-request notification to the business inbox. */
export async function notifyReservation(payload) {
  if (!sesConfigured()) {
    console.warn("SES not configured — skipping reservation email notification.");
    return;
  }

  const to = Netlify.env.get("NOTIFY_EMAIL") || "hello@charlotteefoil.com";
  const name = [payload.first_name, payload.last_name].filter(Boolean).join(" ") || "Unknown";
  const interests = (payload.interests || []).map((i) => INTEREST_LABELS[i] || i);

  const rows = [
    ["Name", name],
    ["Email", payload.email],
    ["Phone", payload.phone],
    ["Preferred session", payload.session_time],
    ["Launch location", payload.launch_location],
    ["Interested in", interests.join(", ")],
    ["Preferred date & questions", payload.preferred_date],
    ["Submitted from", payload.source_path],
  ];

  const html = `
    <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;color:#12303f;line-height:1.5">
      <h2 style="margin:0 0 12px">New reservation request</h2>
      <table style="border-collapse:collapse;width:100%;max-width:560px">
        ${rows
          .map(
            ([label, value]) => `
          <tr>
            <td style="padding:8px 12px;border:1px solid #e2e8ec;background:#f4f7f9;font-weight:600;white-space:nowrap;vertical-align:top">${esc(label)}</td>
            <td style="padding:8px 12px;border:1px solid #e2e8ec">${esc(value) || "—"}</td>
          </tr>`
          )
          .join("")}
      </table>
      <p style="margin-top:16px;color:#5a6b74;font-size:13px">Reply directly to this email to reach ${esc(name)}.</p>
    </div>`;

  await sendEmail({
    to,
    replyTo: payload.email,
    subject: `New reservation request — ${name}`,
    html,
  });
}
