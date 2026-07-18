import { describe, expect, it } from "vitest";
import { flyerPublicUrl, parseFlyerId } from "../netlify/functions/_shared/flyers.mjs";

const VALID_ID = "f1000001-0000-4000-8000-000000000001";

describe("flyer helpers", () => {
  describe("flyerPublicUrl", () => {
    it("builds a public flyer url", () => {
      expect(flyerPublicUrl("https://site.test", VALID_ID)).toBe(
        `https://site.test/api/flyer?id=${VALID_ID}`
      );
    });

    it("strips trailing slashes from base urls", () => {
      expect(flyerPublicUrl("https://site.test/", VALID_ID)).toBe(
        `https://site.test/api/flyer?id=${VALID_ID}`
      );
    });

    it("rejects invalid ids", () => {
      expect(flyerPublicUrl("https://site.test", "nope")).toBeNull();
    });
  });

  describe("parseFlyerId", () => {
    it("parses valid ids", () => {
      expect(parseFlyerId(VALID_ID)).toBe(VALID_ID);
    });

    it("returns null for empty input", () => {
      expect(parseFlyerId(undefined)).toBeNull();
    });

    it("returns an error for invalid ids", () => {
      expect(parseFlyerId("123")).toEqual({
        error: "Invalid flyer id.",
        status: 400,
      });
    });
  });
});
