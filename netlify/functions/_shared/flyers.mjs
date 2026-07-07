import { getStore } from "@netlify/blobs";

export const FLYER_STORE = "email-flyers";
export const FLYER_MAX_BYTES = 2 * 1024 * 1024;
export const FLYER_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const FLYER_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function flyerPublicUrl(baseUrl, flyerId) {
  if (!flyerId || !FLYER_ID_RE.test(flyerId)) return null;
  return `${String(baseUrl).replace(/\/$/, "")}/api/flyer?id=${encodeURIComponent(flyerId)}`;
}

function blobKey(id) {
  return `flyers/${id}`;
}

export async function saveFlyer(id, buffer, contentType) {
  const store = getStore({ name: FLYER_STORE, consistency: "strong" });
  await store.set(blobKey(id), buffer, { metadata: { contentType } });
}

export async function loadFlyer(id) {
  if (!FLYER_ID_RE.test(id)) return null;
  const store = getStore({ name: FLYER_STORE });
  const result = await store.getWithMetadata(blobKey(id), { type: "arrayBuffer" });
  if (!result?.data) return null;
  const contentType = result.metadata?.contentType;
  if (!contentType || !FLYER_TYPES.has(contentType)) return null;
  return { data: result.data, contentType };
}

export function parseFlyerId(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  const id = String(raw).trim();
  if (!FLYER_ID_RE.test(id)) return { error: "Invalid flyer id.", status: 400 };
  return id;
}
