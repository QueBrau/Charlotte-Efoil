import { sendBatch, sesConfigured } from "./ses.mjs";
import { isPermanentSendFailure, recordEmailBounce } from "./bounce.mjs";

export function wrapCampaignHtml(campaignHtml, unsubscribeUrl) {
  const address = Netlify.env.get("MAIL_FOOTER_ADDRESS") || "CharlotteEfoil · Charlotte, NC";
  return `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;color:#12303f;line-height:1.6;max-width:600px;margin:0 auto">
    ${campaignHtml}
    <hr style="border:none;border-top:1px solid #e2e8ec;margin:28px 0 12px" />
    <p style="color:#8a9aa3;font-size:12px;line-height:1.5">
      ${address}<br />
      You're receiving this because you contacted CharlotteEfoil.
      <a href="${unsubscribeUrl}" style="color:#2b6b88">Unsubscribe</a>.
    </p>
  </div>`;
}

export function siteBaseUrl(req, context) {
  return (
    Netlify.env.get("SITE_URL") ||
    context?.site?.url ||
    (req ? new URL(req.url).origin : "")
  ).replace(/\/$/, "");
}

/** Run a stored campaign row against the current email audience. */
export async function executeCampaignSend(supabase, campaign, baseUrl) {
  if (!sesConfigured()) {
    await supabase
      .from("email_campaigns")
      .update({ status: "failed", error: "SES is not configured." })
      .eq("id", campaign.id);
    throw new Error("SES is not configured.");
  }

  const { data: audience, error: aErr } = await supabase
    .from("email_audience")
    .select("id, email, first_name, unsubscribe_token");
  if (aErr) throw aErr;

  const recipients = (audience || []).map((r) => ({
    lead_id: r.id,
    email: r.email,
    first_name: r.first_name,
    unsubscribeUrl: `${baseUrl}/api/unsubscribe?token=${r.unsubscribe_token}`,
  }));

  await supabase
    .from("email_campaigns")
    .update({ status: "sending", total_recipients: recipients.length })
    .eq("id", campaign.id);

  let sent = 0;
  let failed = 0;
  let sendLog = [];

  const flushLog = async () => {
    if (!sendLog.length) return;
    const chunk = sendLog;
    sendLog = [];
    await supabase.from("email_sends").insert(chunk);
  };

  await sendBatch({
    recipients,
    subject: campaign.subject,
    from: Netlify.env.get("SES_FROM_EMAIL") || undefined,
    concurrency: 5,
    renderHtml: (r) => wrapCampaignHtml(campaign.html, r.unsubscribeUrl),
    onResult: async (r, ok, err) => {
      if (ok) sent++;
      else failed++;
      sendLog.push({
        campaign_id: campaign.id,
        lead_id: r.lead_id,
        email: r.email,
        status: ok ? "sent" : "failed",
        error: err,
      });
      if (!ok && err && isPermanentSendFailure(err)) {
        try {
          await recordEmailBounce({
            email: r.email,
            reason: err,
            kind: "send_failure",
            permanent: true,
          });
        } catch (bounceErr) {
          console.error("failed to record send bounce:", r.email, bounceErr);
        }
      }
      if (sendLog.length >= 500) await flushLog();
    },
  });

  await flushLog();

  await supabase
    .from("email_campaigns")
    .update({
      status: "sent",
      sent_count: sent,
      failed_count: failed,
      sent_at: new Date().toISOString(),
    })
    .eq("id", campaign.id);

  return { sent, failed, total: recipients.length };
}

export async function triggerBackgroundCampaignSend({ base, campaignId, token }) {
  await fetch(`${base}/.netlify/functions/send-campaign-background`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campaign_id: campaignId, token }),
  });
}

/** Parts of a date in a specific IANA timezone. */
export function zonedParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
  };
}

export function sameMonthInTz(a, b, timeZone) {
  const pa = zonedParts(a, timeZone);
  const pb = zonedParts(b, timeZone);
  return pa.year === pb.year && pa.month === pb.month;
}

/** True when a monthly schedule should fire in this hourly cron tick. */
export function scheduleIsDue(schedule, now = new Date()) {
  if (!schedule.enabled) return false;
  const tz = schedule.timezone || "America/New_York";
  const parts = zonedParts(now, tz);
  if (parts.day !== Number(schedule.day_of_month)) return false;
  if (parts.hour !== Number(schedule.send_hour)) return false;
  if (schedule.last_sent_at && sameMonthInTz(new Date(schedule.last_sent_at), now, tz)) {
    return false;
  }
  return true;
}

/** Human-readable next run hint for the admin UI (approximate). */
export function computeNextRunLabel(schedule, now = new Date()) {
  const tz = schedule.timezone || "America/New_York";
  const parts = zonedParts(now, tz);
  let year = parts.year;
  let month = parts.month;
  const dom = Number(schedule.day_of_month);
  const hour = Number(schedule.send_hour);

  const passedThisMonth =
    parts.day > dom || (parts.day === dom && parts.hour >= hour);
  if (passedThisMonth) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  const hour12 = hour % 12 || 12;
  const ampm = hour < 12 ? "AM" : "PM";
  const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  return `${monthName} ${dom}, ${year} at ${hour12}:00 ${ampm} ET`;
}
