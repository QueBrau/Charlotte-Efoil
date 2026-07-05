import { getSupabase } from "./_shared/supabase.mjs";

function page(title, message) {
  return new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="robots" content="noindex" />
      <title>${title} | CharlotteEfoil</title>
      <style>
        body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0d1519;color:#eef4f6;font-family:system-ui,Arial,sans-serif;padding:1.5rem}
        .card{max-width:420px;text-align:center;background:#142027;border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:2rem}
        h1{font-size:1.2rem;margin:0 0 .5rem}
        p{color:#93a7b0;margin:0}
        a{color:#4fb0d4}
      </style></head>
      <body><div class="card"><h1>${title}</h1><p>${message}</p></div></body></html>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

async function unsubscribe(token) {
  if (!token) return page("Invalid link", "This unsubscribe link is missing its token.");
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("leads")
      .update({ unsubscribed_at: new Date().toISOString(), marketing_consent: false })
      .eq("unsubscribe_token", token)
      .select("email")
      .maybeSingle();
    if (error) throw error;
    if (!data) return page("Not found", "We couldn't find that subscription. It may already be removed.");
    return page("You're unsubscribed", `${data.email} has been removed from CharlotteEfoil emails. You won't receive further marketing messages.`);
  } catch (err) {
    console.error("unsubscribe failed:", err);
    return page("Something went wrong", "Please try again later or email hello@charlotteefoil.com.");
  }
}

export default async (req) => {
  const url = new URL(req.url);
  // Supports both the emailed link (GET ?token=) and one-click POST unsubscribe.
  const token = url.searchParams.get("token");
  if (req.method === "POST" || req.method === "GET") {
    return unsubscribe(token);
  }
  return new Response("Method not allowed", { status: 405 });
};

export const config = {
  path: "/api/unsubscribe",
  method: ["GET", "POST"],
};
