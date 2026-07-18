import {
  CONTENT_SLUGS,
  DEFAULT_SITE_CONTENT,
  mergePageContent,
  isContentSlug,
} from "../../../js/site-content-schema.js";

export { CONTENT_SLUGS, DEFAULT_SITE_CONTENT, mergePageContent, isContentSlug };

function normalizeDraft(slug, draft = {}) {
  if (slug !== "global" || !draft || typeof draft !== "object") return draft;
  const { phone_tel, ...rest } = draft;
  return rest;
}

export async function ensureContentRows(supabase) {
  const { data: existing, error } = await supabase.from("site_content").select("slug");
  if (error) throw error;
  const have = new Set((existing || []).map((row) => row.slug));
  const missing = CONTENT_SLUGS.filter((slug) => !have.has(slug));
  if (!missing.length) return;

  const rows = missing.map((slug) => ({
    slug,
    draft: DEFAULT_SITE_CONTENT[slug],
    published: DEFAULT_SITE_CONTENT[slug],
    published_at: new Date().toISOString(),
  }));
  const { error: insertError } = await supabase.from("site_content").insert(rows);
  if (insertError) throw insertError;
}

export async function getContentRow(supabase, slug) {
  if (!isContentSlug(slug)) return { error: "Unknown content page.", status: 400 };
  await ensureContentRows(supabase);
  const { data, error } = await supabase
    .from("site_content")
    .select("slug, draft, published, updated_at, published_at")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { error: "Content page not found.", status: 404 };
  return {
    slug: data.slug,
    draft: mergePageContent(slug, data.draft),
    published: mergePageContent(slug, data.published),
    updated_at: data.updated_at,
    published_at: data.published_at,
  };
}

export async function listContentRows(supabase) {
  await ensureContentRows(supabase);
  const { data, error } = await supabase
    .from("site_content")
    .select("slug, updated_at, published_at")
    .order("slug");
  if (error) throw error;
  return (data || []).map((row) => ({
    slug: row.slug,
    label: CONTENT_SLUGS.includes(row.slug) ? row.slug : row.slug,
    updated_at: row.updated_at,
    published_at: row.published_at,
  }));
}

export async function getPublishedPages(supabase, slugs) {
  await ensureContentRows(supabase);
  const unique = [...new Set(slugs.filter(isContentSlug))];
  if (!unique.length) return { pages: {} };

  const { data, error } = await supabase
    .from("site_content")
    .select("slug, published")
    .in("slug", unique);
  if (error) throw error;

  const pages = {};
  for (const slug of unique) {
    const row = (data || []).find((r) => r.slug === slug);
    pages[slug] = mergePageContent(slug, row?.published || {});
  }
  return { pages };
}

export async function saveContentDraft(supabase, slug, draft) {
  if (!isContentSlug(slug)) return { error: "Unknown content page.", status: 400 };
  if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
    return { error: "Draft content must be an object.", status: 400 };
  }
  await ensureContentRows(supabase);
  const merged = mergePageContent(slug, normalizeDraft(slug, draft));
  const { data, error } = await supabase
    .from("site_content")
    .update({ draft: merged, updated_at: new Date().toISOString() })
    .eq("slug", slug)
    .select("slug, draft, published, updated_at, published_at")
    .single();
  if (error) throw error;
  return {
    ok: true,
    slug: data.slug,
    draft: mergePageContent(slug, data.draft),
    published: mergePageContent(slug, data.published),
    updated_at: data.updated_at,
    published_at: data.published_at,
  };
}

export async function publishContent(supabase, slug) {
  if (!isContentSlug(slug)) return { error: "Unknown content page.", status: 400 };
  await ensureContentRows(supabase);
  const { data: current, error: readError } = await supabase
    .from("site_content")
    .select("draft")
    .eq("slug", slug)
    .maybeSingle();
  if (readError) throw readError;
  if (!current) return { error: "Content page not found.", status: 404 };

  const published = mergePageContent(slug, current.draft);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("site_content")
    .update({ published, published_at: now, updated_at: now })
    .eq("slug", slug)
    .select("slug, draft, published, updated_at, published_at")
    .single();
  if (error) throw error;
  return {
    ok: true,
    slug: data.slug,
    draft: mergePageContent(slug, data.draft),
    published: mergePageContent(slug, data.published),
    updated_at: data.updated_at,
    published_at: data.published_at,
  };
}
