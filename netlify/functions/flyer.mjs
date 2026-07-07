import { loadFlyer } from "./_shared/flyers.mjs";

export default async (req) => {
  if (req.method !== "GET") return new Response("Method not allowed", { status: 405 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return new Response("Not found", { status: 404 });

  try {
    const flyer = await loadFlyer(id);
    if (!flyer) return new Response("Not found", { status: 404 });

    return new Response(flyer.data, {
      status: 200,
      headers: {
        "Content-Type": flyer.contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("flyer serve failed:", id, err);
    return new Response("Error", { status: 500 });
  }
};

export const config = {
  path: "/api/flyer",
  method: ["GET"],
};
