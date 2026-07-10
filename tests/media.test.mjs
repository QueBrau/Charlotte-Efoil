import { describe, expect, it } from "vitest";
import {
  detectMediaKind,
  maxBytesForKind,
  mediaPublicUrl,
  parseMediaId,
  MEDIA_MAX_IMAGE_BYTES,
  MEDIA_MAX_VIDEO_BYTES,
} from "../netlify/functions/_shared/media.mjs";

const VALID_ID = "a1000001-0000-4000-8000-000000000001";

describe("media helpers", () => {
  describe("mediaPublicUrl", () => {
    it("builds a public media url for valid ids", () => {
      expect(mediaPublicUrl("https://site.test/", VALID_ID)).toBe(
        `https://site.test/api/media?id=${VALID_ID}`
      );
    });

    it("rejects invalid ids", () => {
      expect(mediaPublicUrl("https://site.test/", "not-a-uuid")).toBeNull();
      expect(mediaPublicUrl("https://site.test/", "")).toBeNull();
    });
  });

  describe("detectMediaKind", () => {
    it("detects videos from content type", () => {
      expect(detectMediaKind("video/mp4", "clip.mp4")).toBe("video");
    });

    it("detects logos from filename", () => {
      expect(detectMediaKind("image/png", "CharlotteEfoil-logo.png")).toBe("logo");
    });

    it("respects explicit kind", () => {
      expect(detectMediaKind("image/png", "photo.png", "logo")).toBe("logo");
    });

    it("defaults to image", () => {
      expect(detectMediaKind("image/jpeg", "photo.jpg")).toBe("image");
    });
  });

  describe("maxBytesForKind", () => {
    it("uses larger limit for videos", () => {
      expect(maxBytesForKind("video", "video/mp4")).toBe(MEDIA_MAX_VIDEO_BYTES);
      expect(maxBytesForKind("image", "image/png")).toBe(MEDIA_MAX_IMAGE_BYTES);
    });
  });

  describe("parseMediaId", () => {
    it("accepts valid uuids", () => {
      expect(parseMediaId(VALID_ID)).toBe(VALID_ID);
      expect(parseMediaId(`  ${VALID_ID}  `)).toBe(VALID_ID);
    });

    it("returns null for empty values", () => {
      expect(parseMediaId("")).toBeNull();
      expect(parseMediaId(null)).toBeNull();
    });

    it("returns an error object for invalid ids", () => {
      expect(parseMediaId("bad-id")).toEqual({
        error: "Invalid media id.",
        status: 400,
      });
    });
  });
});
