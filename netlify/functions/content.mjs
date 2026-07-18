import { getSupabase } from "./_shared/supabase.mjs";
import { json, preflight } from "./_shared/http.mjs";
import { getPublishedPages, isContentSlug } from "./_shared/site-content.mjs";

export default async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const url = new URL(req.url);
  const pagesParam = url.searchParams.get("pages") || url.searchParams.get("page") || "global";
  const slugs = pagesParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter(isContentSlug);

  if (!slugs.length) return json({ error: "No valid pages requested." }, 400);

  try {
    const supabase = getSupabase();
    const result = await getPublishedPages(supabase, slugs);
    return json(result);
  } catch (err) {
    console.error("content fetch failed:", err);
    return json({ error: "Could not load content." }, 500);
  }
};

export const config = {
  path: "/api/content",
  method: ["GET", "OPTIONS"],
};
