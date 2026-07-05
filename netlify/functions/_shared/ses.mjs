import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

// NOTE: Netlify Functions run on AWS Lambda, where AWS_ACCESS_KEY_ID and friends
// are reserved by the runtime. We therefore use SES_-prefixed variables and pass
// them explicitly to the client.

let client = null;

export function sesConfigured() {
  return Boolean(Netlify.env.get("SES_ACCESS_KEY_ID") && Netlify.env.get("SES_SECRET_ACCESS_KEY"));
}

export function getSes() {
  if (client) return client;
  const region = Netlify.env.get("SES_REGION") || "us-east-1";
  const accessKeyId = Netlify.env.get("SES_ACCESS_KEY_ID");
  const secretAccessKey = Netlify.env.get("SES_SECRET_ACCESS_KEY");
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Missing SES_ACCESS_KEY_ID / SES_SECRET_ACCESS_KEY.");
  }
  client = new SESv2Client({ region, credentials: { accessKeyId, secretAccessKey } });
  return client;
}

export function getFromAddress() {
  return Netlify.env.get("SES_FROM_EMAIL") || "CharlotteEfoil <reservations@charlotteefoil.com>";
}

/**
 * Sends a single email through SES v2.
 * @param {object} opts
 * @param {string|string[]} opts.to
 * @param {string} opts.subject
 * @param {string} opts.html
 * @param {string} [opts.text]
 * @param {string} [opts.from]
 * @param {string} [opts.replyTo]
 * @param {string} [opts.unsubscribeUrl]  adds a List-Unsubscribe header
 */
export async function sendEmail({ to, subject, html, text, from, replyTo, unsubscribeUrl }) {
  const ses = getSes();

  const headers = unsubscribeUrl
    ? [
        { Name: "List-Unsubscribe", Value: `<${unsubscribeUrl}>` },
        { Name: "List-Unsubscribe-Post", Value: "List-Unsubscribe=One-Click" },
      ]
    : undefined;

  const command = new SendEmailCommand({
    FromEmailAddress: from || getFromAddress(),
    Destination: { ToAddresses: Array.isArray(to) ? to : [to] },
    ReplyToAddresses: replyTo ? [replyTo] : undefined,
    Content: {
      Simple: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: html, Charset: "UTF-8" },
          ...(text ? { Text: { Data: text, Charset: "UTF-8" } } : {}),
        },
        ...(headers ? { Headers: headers } : {}),
      },
    },
  });

  return ses.send(command);
}

/**
 * Sends to many recipients with bounded concurrency and simple throttle backoff,
 * calling onResult(recipient, ok, error) for each. Designed to be run inside a
 * background function (15-min limit). `renderHtml(recipient)` builds per-user HTML
 * (e.g. with a personalized unsubscribe link).
 */
export async function sendBatch({
  recipients,
  subject,
  renderHtml,
  from,
  concurrency = 5,
  onResult,
}) {
  let index = 0;

  async function worker() {
    while (index < recipients.length) {
      const i = index++;
      const r = recipients[i];
      try {
        await sendEmail({
          to: r.email,
          subject,
          html: renderHtml(r),
          from,
          unsubscribeUrl: r.unsubscribeUrl,
        });
        if (onResult) await onResult(r, true, null);
      } catch (err) {
        // Back off briefly on throttling, then record failure.
        if (err?.name === "TooManyRequestsException" || err?.name === "Throttling") {
          await new Promise((res) => setTimeout(res, 1000));
        }
        if (onResult) await onResult(r, false, err?.message || String(err));
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, recipients.length) }, worker);
  await Promise.all(workers);
}
