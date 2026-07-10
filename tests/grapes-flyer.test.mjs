import { describe, expect, it } from "vitest";
import { mediaToGrapesAssets } from "../js/grapes-flyer.js";

describe("grapes-flyer helpers", () => {
  describe("mediaToGrapesAssets", () => {
    it("maps image and logo items for the asset manager", () => {
      const assets = mediaToGrapesAssets([
        {
          kind: "logo",
          content_type: "image/png",
          url: "https://site.test/api/media?id=1",
          name: "Logo",
        },
        {
          kind: "image",
          content_type: "image/jpeg",
          url: "https://site.test/api/media?id=2",
          name: "Lake",
        },
      ]);

      expect(assets).toEqual([
        {
          type: "image",
          src: "https://site.test/api/media?id=1",
          name: "Logo",
          height: 80,
          width: 120,
        },
        {
          type: "image",
          src: "https://site.test/api/media?id=2",
          name: "Lake",
          height: 80,
          width: 120,
        },
      ]);
    });

    it("maps videos with video asset type", () => {
      const assets = mediaToGrapesAssets([
        {
          kind: "video",
          content_type: "video/mp4",
          url: "https://site.test/api/media?id=3",
          name: "Clip",
        },
      ]);

      expect(assets[0]).toMatchObject({
        type: "video",
        src: "https://site.test/api/media?id=3",
        height: 120,
        width: 200,
      });
    });

    it("skips items without urls", () => {
      expect(mediaToGrapesAssets([{ kind: "image", name: "Missing url" }])).toEqual([]);
    });
  });
});
