import { createHash } from "crypto";
import { mkdirSync, readFileSync } from "fs";
import { dirname } from "path";

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function ensureDir(path) {
  mkdirSync(dirname(path), { recursive: true });
  mkdirSync(path, { recursive: true });
}

export function hashBuffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Upgrade Shopify CDN URLs to the highest available width. */
export function maxResolutionShopifyUrl(url, maxWidth = 4096) {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("width", String(maxWidth));
    return parsed.toString();
  } catch {
    return url;
  }
}

export function normalizeMediaUrl(url, baseUrl) {
  if (!url) return null;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return new URL(url, baseUrl).toString();
  return url;
}

export function loadEnvFiles(paths) {
  const env = {};
  for (const file of paths) {
    try {
      const text = readEnvFile(file);
      if (!text) continue;
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        env[key] = val;
      }
    } catch {
      // optional env files
    }
  }
  return env;
}

function readEnvFile(filePath) {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

export function isSupabaseConfigured(env) {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
      (env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

export function publicUrlForSlug(slug, filename) {
  return `/products/${slug}/${filename}`;
}
