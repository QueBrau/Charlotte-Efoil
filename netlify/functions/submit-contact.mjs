import { getSupabase } from "./_shared/supabase.mjs";
import {
  json,
  preflight,
  readBody,
  hashIp,
  isValidEmail,
  clean,
  isSpam,
} from "./_shared/http.mjs";

export default async (req, context) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = await readBody(req);

  // Silently accept spam so bots don't learn anything, but never store it.
  if (isSpam(body)) return json({ ok: true });

  const email = clean(body.email, 320);
  const message = clean(body.message, 5000);

  if (!isValidEmail(email)) return json({ error: "A valid email is required." }, 400);
  if (!message) return json({ error: "A message is required." }, 400);

  const payload = {
    email,
    name: clean(body.name, 200),
    message,
    visitor_token: clean(body.visitor_token, 100),
    source_path: clean(body.source_path, 500),
    referrer: clean(body.referrer, 1000),
    user_agent: clean(req.headers.get("user-agent"), 1000),
    ip_hash: await hashIp(context.ip),
  };

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("submit_contact", { p: payload });
    if (error) throw error;
    return json({ ok: true, id: data });
  } catch (err) {
    console.error("submit-contact failed:", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
};

export const config = {
  path: "/api/contact",
  method: ["POST", "OPTIONS"],
};
