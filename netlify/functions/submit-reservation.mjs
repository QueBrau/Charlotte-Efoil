import { getSupabase } from "./_shared/supabase.mjs";
import { notifyReservation } from "./_shared/notify.mjs";
import {
  json,
  preflight,
  readBody,
  hashIp,
  isValidEmail,
  clean,
  isSpam,
} from "./_shared/http.mjs";

const VALID_INTERESTS = new Set(["lesson", "demo", "corporate", "family"]);
const VALID_SESSION_TIMES = new Set(["morning", "afternoon", "flexible"]);
const VALID_LOCATIONS = new Set(["public", "private", "unsure"]);

export default async (req, context) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = await readBody(req);
  if (isSpam(body)) return json({ ok: true });

  const email = clean(body.email, 320);
  if (!isValidEmail(email)) return json({ error: "A valid email is required." }, 400);

  const interests = Array.isArray(body.interests)
    ? [...new Set(body.interests.filter((i) => VALID_INTERESTS.has(i)))]
    : [];

  const sessionTime = VALID_SESSION_TIMES.has(body.session_time) ? body.session_time : null;
  const launchLocation = VALID_LOCATIONS.has(body.launch_location) ? body.launch_location : null;

  const payload = {
    email,
    first_name: clean(body.first_name, 150),
    last_name: clean(body.last_name, 150),
    phone: clean(body.phone, 40),
    session_time: sessionTime,
    launch_location: launchLocation,
    preferred_date: clean(body.preferred_date, 4000),
    notes: clean(body.notes, 4000),
    terms_accepted: Boolean(body.terms_accepted),
    interests,
    visitor_token: clean(body.visitor_token, 100),
    source_path: clean(body.source_path, 500),
    referrer: clean(body.referrer, 1000),
    user_agent: clean(req.headers.get("user-agent"), 1000),
    ip_hash: await hashIp(context.ip),
  };

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("submit_reservation", { p: payload });
    if (error) throw error;

    // Route the reservation to the business inbox. Don't fail the request if
    // email delivery has a hiccup — the submission is already saved.
    const emailTask = notifyReservation(payload).catch((e) =>
      console.error("reservation email failed:", e)
    );
    if (context.waitUntil) context.waitUntil(emailTask);
    else await emailTask;

    return json({ ok: true, id: data });
  } catch (err) {
    console.error("submit-reservation failed:", err);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
};

export const config = {
  path: "/api/reservations",
  method: ["POST", "OPTIONS"],
};
