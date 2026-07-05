import { getSupabase } from "./_shared/supabase.mjs";
import { readBody } from "./_shared/http.mjs";
import {
  executeCampaignSend,
  scheduleIsDue,
  siteBaseUrl,
  triggerBackgroundCampaignSend,
} from "./_shared/campaign-send.mjs";

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Netlify scheduled function — runs hourly (UTC). Checks monthly schedules in ET.
export default async (req, context) => {
  const supabase = getSupabase();
  const base = siteBaseUrl(req, context);
  const token = Netlify.env.get("ADMIN_PASSWORD");

  const { data: schedules, error } = await supabase
    .from("email_schedules")
    .select("*")
    .eq("enabled", true);
  if (error) {
    console.error("schedule runner: load failed", error);
    return new Response("error", { status: 500 });
  }

  const due = (schedules || []).filter((s) => scheduleIsDue(s));
  const results = [];

  for (const schedule of due) {
    try {
      const { data: campaign, error: cErr } = await supabase
        .from("email_campaigns")
        .insert({
          subject: schedule.subject,
          html: schedule.html,
          status: "sending",
          schedule_id: schedule.id,
        })
        .select("id, subject, html")
        .single();
      if (cErr) throw cErr;

      if (token) {
        await triggerBackgroundCampaignSend({ base, campaignId: campaign.id, token });
      } else {
        await executeCampaignSend(supabase, campaign, base);
      }

      await supabase
        .from("email_schedules")
        .update({ last_sent_at: new Date().toISOString() })
        .eq("id", schedule.id);

      results.push({ id: schedule.id, campaign_id: campaign.id, ok: true });
    } catch (err) {
      console.error("schedule send failed:", schedule.id, err);
      results.push({ id: schedule.id, ok: false, error: String(err?.message || err) });
    }
  }

  console.log("email schedule runner:", { checked: schedules?.length || 0, due: due.length, results });
  return new Response(JSON.stringify({ ok: true, due: due.length, results }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const config = {
  schedule: "@hourly",
};
