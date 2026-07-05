import { getSupabase } from "./_shared/supabase.mjs";
import { sendBatch, sesConfigured } from "./_shared/ses.mjs";
import { readBody } from "./_shared/http.mjs";

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function baseUrl(req, context) {
  return (
    Netlify.env.get("SITE_URL") ||
    context.site?.url ||
    new URL(req.url).origin
  ).replace(/\/$/, "");
}

function wrapHtml(campaignHtml, unsubscribeUrl) {
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

// Background function: returns 202 immediately; sends can take up to 15 minutes.
export default async (req, context) => {
  const body = await readBody(req);
  const campaignId = body.campaign_id;
  const token = body.token;

  const adminPassword = Netlify.env.get("ADMIN_PASSWORD");
  if (!adminPassword || !safeEqual(token || "", adminPassword)) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!campaignId) return new Response("Missing campaign_id", { status: 400 });

  const supabase = getSupabase();

  try {
    const { data: campaign, error: cErr } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", campaignId)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!campaign) return new Response("Campaign not found", { status: 404 });

    if (!sesConfigured()) {
      await supabase
        .from("email_campaigns")
        .update({ status: "failed", error: "SES is not configured." })
        .eq("id", campaignId);
      return new Response("SES not configured", { status: 500 });
    }

    const { data: audience, error: aErr } = await supabase
      .from("email_audience")
      .select("id, email, first_name, unsubscribe_token");
    if (aErr) throw aErr;

    const base = baseUrl(req, context);
    const recipients = (audience || []).map((r) => ({
      lead_id: r.id,
      email: r.email,
      first_name: r.first_name,
      unsubscribeUrl: `${base}/api/unsubscribe?token=${r.unsubscribe_token}`,
    }));

    await supabase
      .from("email_campaigns")
      .update({ status: "sending", total_recipients: recipients.length })
      .eq("id", campaignId);

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
      renderHtml: (r) => wrapHtml(campaign.html, r.unsubscribeUrl),
      onResult: async (r, ok, err) => {
        if (ok) sent++;
        else failed++;
        sendLog.push({
          campaign_id: campaignId,
          lead_id: r.lead_id,
          email: r.email,
          status: ok ? "sent" : "failed",
          error: err,
        });
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
      .eq("id", campaignId);

    return new Response("done", { status: 200 });
  } catch (err) {
    console.error("campaign send failed:", err);
    await supabase
      .from("email_campaigns")
      .update({ status: "failed", error: String(err?.message || err) })
      .eq("id", campaignId);
    return new Response("error", { status: 500 });
  }
};
