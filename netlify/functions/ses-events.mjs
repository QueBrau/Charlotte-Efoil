import { json, readBody } from "./_shared/http.mjs";
import { parseSesSnsMessage, recordEmailBounce } from "./_shared/bounce.mjs";

async function confirmSubscription(body) {
  const url = body.SubscribeURL;
  if (!url) return json({ error: "missing SubscribeURL" }, 400);
  await fetch(url);
  return json({ ok: true, subscribed: true });
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expectedArn = Netlify.env.get("SES_SNS_TOPIC_ARN");
  let body;
  try {
    body = await readBody(req);
  } catch {
    return json({ error: "Invalid body" }, 400);
  }

  const type = body.Type || body.type;

  if (type === "SubscriptionConfirmation") {
    return confirmSubscription(body);
  }

  if (expectedArn && body.TopicArn && body.TopicArn !== expectedArn) {
    console.warn("ses-events: rejected TopicArn", body.TopicArn);
    return json({ error: "Forbidden" }, 403);
  }

  if (type !== "Notification") {
    return json({ ok: true, ignored: type || "unknown" });
  }

  let message;
  try {
    message = typeof body.Message === "string" ? JSON.parse(body.Message) : body.Message;
  } catch {
    return json({ error: "Invalid SNS Message JSON" }, 400);
  }

  const recipients = parseSesSnsMessage(message);
  const results = [];

  for (const r of recipients) {
    try {
      const result = await recordEmailBounce({
        email: r.email,
        reason: r.reason,
        kind: r.kind,
        permanent: r.permanent,
        raw: message,
      });
      results.push({ email: r.email, ...result });
    } catch (err) {
      console.error("bounce handler failed:", r.email, err);
      results.push({ email: r.email, ok: false, error: String(err?.message || err) });
    }
  }

  return json({ ok: true, processed: results.length, results });
};

export const config = {
  path: "/api/ses-events",
  method: ["POST"],
};
