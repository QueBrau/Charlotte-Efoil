// Email notifications via the Resend HTTP API (no extra dependency).
// Configure with RESEND_API_KEY, NOTIFY_EMAIL, and FROM_EMAIL. If RESEND_API_KEY
// is not set, sending is skipped silently so submissions still succeed.

function esc(s) {
  return String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

async function sendEmail({ to, replyTo, subject, html }) {
  const apiKey = Netlify.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping email notification.");
    return;
  }

  const from = Netlify.env.get("FROM_EMAIL") || "CharlotteEfoil <reservations@charlotteefoil.com>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(to) ? to : [to],
      reply_to: replyTo || undefined,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend responded ${res.status}: ${detail}`);
  }
}

const INTEREST_LABELS = {
  lesson: "One-on-one / 2-rider private session",
  demo: "Lift eFoil purchase demonstration",
  corporate: "Corporate event / team building",
  family: "Family gathering or outing",
};

/** Sends a formatted reservation-request notification to the business inbox. */
export async function notifyReservation(payload) {
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
