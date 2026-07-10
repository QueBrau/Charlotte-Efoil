import { getStore } from "@netlify/blobs";

export const MEDIA_STORE = "email-media";
export const MEDIA_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const MEDIA_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

export const MEDIA_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

export const MEDIA_TYPES = new Set([...MEDIA_IMAGE_TYPES, ...MEDIA_VIDEO_TYPES]);

export const MEDIA_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MEDIA_MAX_VIDEO_BYTES = 25 * 1024 * 1024;

export function mediaPublicUrl(baseUrl, id) {
  if (!id || !MEDIA_ID_RE.test(id)) return null;
  return `${String(baseUrl).replace(/\/$/, "")}/api/media?id=${encodeURIComponent(id)}`;
}

export function detectMediaKind(contentType, filename = "", requestedKind = "") {
  const kind = String(requestedKind || "").toLowerCase();
  if (kind === "logo" || kind === "video" || kind === "image") return kind;
  if (MEDIA_VIDEO_TYPES.has(contentType)) return "video";
  if (/logo/i.test(filename) || /logo/i.test(String(requestedKind))) return "logo";
  return "image";
}

export function maxBytesForKind(kind, contentType) {
  if (kind === "video" || MEDIA_VIDEO_TYPES.has(contentType)) return MEDIA_MAX_VIDEO_BYTES;
  return MEDIA_MAX_IMAGE_BYTES;
}

function blobKey(id) {
  return `media/${id}`;
}

export async function saveMedia(id, buffer, contentType) {
  const store = getStore({ name: MEDIA_STORE, consistency: "strong" });
  await store.set(blobKey(id), buffer, { metadata: { contentType } });
}

export async function loadMedia(id) {
  if (!MEDIA_ID_RE.test(id)) return null;
  const store = getStore({ name: MEDIA_STORE, consistency: "strong" });
  const result = await store.getWithMetadata(blobKey(id), { type: "arrayBuffer" });
  if (!result?.data) return null;
  const contentType = result.metadata?.contentType;
  if (!contentType || !MEDIA_TYPES.has(contentType)) return null;
  return { data: result.data, contentType };
}

export async function deleteMediaBlob(id) {
  if (!MEDIA_ID_RE.test(id)) return;
  const store = getStore({ name: MEDIA_STORE, consistency: "strong" });
  await store.delete(blobKey(id));
}

export function parseMediaId(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  const id = String(raw).trim();
  if (!MEDIA_ID_RE.test(id)) return { error: "Invalid media id.", status: 400 };
  return id;
}
