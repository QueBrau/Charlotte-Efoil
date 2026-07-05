import { getSupabase } from "./_shared/supabase.mjs";
import { readBody } from "./_shared/http.mjs";
import { executeCampaignSend, siteBaseUrl } from "./_shared/campaign-send.mjs";

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
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

    const base = siteBaseUrl(req, context);
    await executeCampaignSend(supabase, campaign, base);
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
