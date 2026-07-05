import { getSupabase } from "./supabase.mjs";

/** True when SES rejected the address permanently (safe to remove from the list). */
export function isPermanentSendFailure(message = "") {
  const m = String(message).toLowerCase();
  if (!m) return false;
  return (
    m.includes("suppressed") ||
    m.includes("does not exist") ||
    m.includes("invalid destination") ||
    m.includes("mailbox unavailable") ||
    m.includes("hard bounce") ||
    m.includes("message rejected")
  );
}

export async function recordEmailBounce({ email, reason, kind = "bounce", permanent = true, raw = null }) {
  if (!email) return { ok: false, error: "missing email" };
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("handle_email_bounce", {
    p_email: email,
    p_reason: reason || null,
    p_kind: kind,
    p_permanent: permanent,
    p_raw: raw,
  });
  if (error) throw error;
  return data || { ok: true };
}

/** Parse an SNS notification payload from SES bounce/complaint events. */
export function parseSesSnsMessage(messageJson) {
  const out = [];
  const type = messageJson.notificationType || messageJson.eventType;

  if (type === "Bounce" || messageJson.bounce) {
    const bounce = messageJson.bounce || {};
    const permanent = bounce.bounceType === "Permanent" || bounce.bounceSubType === "Suppressed";
    const reason = [bounce.bounceType, bounce.bounceSubType].filter(Boolean).join(" · ") || "bounce";
    for (const r of bounce.bouncedRecipients || []) {
      if (r.emailAddress) out.push({ email: r.emailAddress, kind: "bounce", permanent, reason });
    }
    return out;
  }

  if (type === "Complaint" || messageJson.complaint) {
    const complaint = messageJson.complaint || {};
    const reason = complaint.complaintFeedbackType || "complaint";
    for (const r of complaint.complainedRecipients || []) {
      if (r.emailAddress) out.push({ email: r.emailAddress, kind: "complaint", permanent: true, reason });
    }
    return out;
  }

  return out;
}
