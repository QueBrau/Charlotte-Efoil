/** Static assets shipped in public/photos and public/videos. */
export const SITE_MEDIA_ENTRIES = [
  {
    path: "photos/CharlotteEfoil.png",
    name: "CharlotteEfoil logo",
    original_filename: "CharlotteEfoil.png",
    content_type: "image/png",
    kind: "logo",
    size_bytes: 59173,
    alt_text: "CharlotteEfoil",
    created_at: "2024-06-01T12:00:00.000Z",
  },
  {
    path: "photos/lakenorman.jpg",
    name: "Lake Norman sunset",
    original_filename: "lakenorman.jpg",
    content_type: "image/jpeg",
    kind: "image",
    size_bytes: 206659,
    alt_text: "Lake Norman",
    created_at: "2024-08-15T14:00:00.000Z",
  },
  {
    path: "photos/waydoo-evo-lite.png",
    name: "Waydoo Evo Lite",
    original_filename: "waydoo-evo-lite.png",
    content_type: "image/png",
    kind: "image",
    size_bytes: 1500801,
    alt_text: "Waydoo Evo Lite board",
    created_at: "2024-09-01T10:00:00.000Z",
  },
  {
    path: "photos/waydoo-evo-max-plus.webp",
    name: "Waydoo Evo Max Plus",
    original_filename: "waydoo-evo-max-plus.webp",
    content_type: "image/webp",
    kind: "image",
    size_bytes: 1538646,
    alt_text: "Waydoo Evo Max Plus board",
    created_at: "2024-09-01T10:05:00.000Z",
  },
  {
    path: "photos/waydoo-evo-pro-plus.webp",
    name: "Waydoo Evo Pro Plus",
    original_filename: "waydoo-evo-pro-plus.webp",
    content_type: "image/webp",
    kind: "image",
    size_bytes: 1456463,
    alt_text: "Waydoo Evo Pro Plus board",
    created_at: "2024-09-01T10:10:00.000Z",
  },
  {
    path: "photos/5'2liftx.png",
    name: "Lift 5'2 X",
    original_filename: "5'2liftx.png",
    content_type: "image/png",
    kind: "image",
    size_bytes: 33468,
    alt_text: "Lift 5'2 X board",
    created_at: "2024-09-10T11:00:00.000Z",
  },
  {
    path: "photos/5'4liftcruiser.png",
    name: "Lift 5'4 Cruiser",
    original_filename: "5'4liftcruiser.png",
    content_type: "image/png",
    kind: "image",
    size_bytes: 106397,
    alt_text: "Lift 5'4 Cruiser board",
    created_at: "2024-09-10T11:05:00.000Z",
  },
  {
    path: "photos/blowfish.png",
    name: "Blowfish board",
    original_filename: "blowfish.png",
    content_type: "image/png",
    kind: "image",
    size_bytes: 52723,
    alt_text: "Blowfish board",
    created_at: "2024-09-12T09:00:00.000Z",
  },
  {
    path: "videos/dan.mov",
    name: "Flight demo clip",
    original_filename: "dan.mov",
    content_type: "video/quicktime",
    kind: "video",
    size_bytes: 1127602,
    alt_text: null,
    created_at: "2025-01-20T16:00:00.000Z",
  },
  {
    path: "videos/hero-efoil.mp4",
    name: "Hero eFoil video",
    original_filename: "hero-efoil.mp4",
    content_type: "video/mp4",
    kind: "video",
    size_bytes: 7724313,
    alt_text: null,
    created_at: "2024-07-01T08:00:00.000Z",
  },
];

const SITE_MEDIA_ID_PREFIX = "site:";

export function siteMediaId(path) {
  return `${SITE_MEDIA_ID_PREFIX}${path}`;
}

export function isSiteMediaId(id) {
  return typeof id === "string" && id.startsWith(SITE_MEDIA_ID_PREFIX);
}

export function buildSiteMediaItems() {
  return SITE_MEDIA_ENTRIES.map((entry) => ({
    id: siteMediaId(entry.path),
    name: entry.name,
    original_filename: entry.original_filename,
    content_type: entry.content_type,
    kind: entry.kind,
    size_bytes: entry.size_bytes,
    alt_text: entry.alt_text,
    created_at: entry.created_at,
    url: `/${entry.path}`,
    source: "site",
    static: true,
  }));
}

function urlPathname(url) {
  if (!url) return "";
  try {
    return new URL(url, "https://site.test").pathname;
  } catch {
    return String(url).split("?")[0];
  }
}

export function mergeMediaLibrary(uploadedItems = [], kind = "") {
  const uploaded = Array.isArray(uploadedItems) ? uploadedItems : [];
  const uploadedPaths = new Set(uploaded.map((item) => urlPathname(item.url)));
  const siteItems = buildSiteMediaItems().filter((item) => !uploadedPaths.has(urlPathname(item.url)));
  let items = [...siteItems, ...uploaded];
  if (kind && ["image", "video", "logo"].includes(kind)) {
    items = items.filter((item) => item.kind === kind);
  }
  items.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  return summarizeMedia(items);
}

export function summarizeMedia(items) {
  const rows = Array.isArray(items) ? items : [];
  return {
    total: rows.length,
    images: rows.filter((r) => r.kind === "image").length,
    videos: rows.filter((r) => r.kind === "video").length,
    logos: rows.filter((r) => r.kind === "logo").length,
    items: rows,
  };
}
