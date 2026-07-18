import { describe, expect, it } from "vitest";
import { clean, hashIp, isSpam, isValidEmail, readBody } from "../netlify/functions/_shared/http.mjs";

describe("http helpers", () => {
  describe("clean", () => {
    it("trims and returns strings", () => {
      expect(clean("  hello  ")).toBe("hello");
    });

    it("returns null for empty or non-string values", () => {
      expect(clean("")).toBeNull();
      expect(clean("   ")).toBeNull();
      expect(clean(null)).toBeNull();
      expect(clean(42)).toBeNull();
    });

    it("caps length", () => {
      expect(clean("abcdef", 3)).toBe("abc");
    });
  });

  describe("isValidEmail", () => {
    it("accepts common email shapes", () => {
      expect(isValidEmail("hello@charlotteefoil.com")).toBe(true);
      expect(isValidEmail("  user@example.co  ")).toBe(true);
    });

    it("rejects invalid emails", () => {
      expect(isValidEmail("not-an-email")).toBe(false);
      expect(isValidEmail("@missing.com")).toBe(false);
      expect(isValidEmail("")).toBe(false);
    });
  });

  describe("isSpam", () => {
    it("flags filled honeypot field", () => {
      expect(isSpam({ company: "Acme Bots LLC" })).toBe(true);
    });

    it("allows empty honeypot field", () => {
      expect(isSpam({ company: "" })).toBe(false);
      expect(isSpam({})).toBe(false);
    });
  });

  describe("readBody", () => {
    it("parses JSON request bodies", async () => {
      const req = new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({ email: "a@b.com" }),
      });
      await expect(readBody(req)).resolves.toEqual({ email: "a@b.com" });
    });

    it("returns {} for invalid JSON", async () => {
      const req = new Request("https://example.com", {
        method: "POST",
        body: "not-json",
      });
      await expect(readBody(req)).resolves.toEqual({});
    });
  });

  describe("hashIp", () => {
    it("returns a stable sha256 hex digest", async () => {
      const a = await hashIp("203.0.113.10");
      const b = await hashIp("203.0.113.10");
      expect(a).toMatch(/^[a-f0-9]{64}$/);
      expect(a).toBe(b);
    });

    it("returns null for missing ip", async () => {
      await expect(hashIp("")).resolves.toBeNull();
      await expect(hashIp(null)).resolves.toBeNull();
    });
  });
});
