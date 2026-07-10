import { loadMedia } from "./_shared/media.mjs";

export default async (req) => {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return new Response("Not found", { status: 404 });

  try {
    const asset = await loadMedia(id);
    if (!asset) return new Response("Not found", { status: 404 });

    return new Response(asset.data, {
      status: 200,
      headers: {
        "Content-Type": asset.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("media serve failed:", id, err);
    return new Response("Error", { status: 500 });
  }
};

export const config = {
  path: "/api/media",
  method: ["GET"],
};
