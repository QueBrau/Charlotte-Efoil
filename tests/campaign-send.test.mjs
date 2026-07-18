import { describe, expect, it } from "vitest";
import {
  computeNextRunLabel,
  logoBlock,
  sameMonthInTz,
  scheduleIsDue,
  siteBaseUrl,
  wrapCampaignHtml,
  zonedParts,
} from "../netlify/functions/_shared/campaign-send.mjs";

describe("campaign-send helpers", () => {
  describe("logoBlock", () => {
    it("builds a linked logo image using the site base", () => {
      const html = logoBlock("https://charlotte-efoil.netlify.app/");
      expect(html).toContain('href="https://charlotte-efoil.netlify.app"');
      expect(html).toContain("/photos/CharlotteEfoil.png");
      expect(html).toContain("CharlotteEfoil");
    });

    it("escapes quotes in base urls", () => {
      const html = logoBlock('https://example.com/"bad');
      expect(html).not.toContain('href="https://example.com/"bad"');
      expect(html).toContain("&quot;");
    });
  });

  describe("wrapCampaignHtml", () => {
    it("includes message, footer address, and unsubscribe link", () => {
      const html = wrapCampaignHtml("<p>Hello lake</p>", "https://site.test/api/unsubscribe?token=abc");
      expect(html).toContain("<p>Hello lake</p>");
      expect(html).toContain("CharlotteEfoil · Charlotte, NC");
      expect(html).toContain('href="https://site.test/api/unsubscribe?token=abc"');
    });

    it("omits the auto logo when a flyer html block is present", () => {
      const html = wrapCampaignHtml("<p>Hi</p>", "https://site.test/u", {
        flyerHtml: "<table><tr><td>Flyer</td></tr></table>",
      });
      expect(html).toContain("Flyer");
      expect(html).not.toContain("/photos/CharlotteEfoil.png");
    });

    it("renders a flyer image url when provided", () => {
      const html = wrapCampaignHtml("<p>Hi</p>", "https://site.test/u", {
        flyerUrl: "https://site.test/api/flyer?id=123",
      });
      expect(html).toContain('src="https://site.test/api/flyer?id=123"');
      expect(html).not.toContain("/photos/CharlotteEfoil.png");
    });
  });

  describe("siteBaseUrl", () => {
    it("prefers SITE_URL over request origin", () => {
      const req = new Request("https://fallback.example/api/admin");
      expect(siteBaseUrl(req, {})).toBe("https://charlotte-efoil.netlify.app");
    });

    it("falls back to the request origin", () => {
      const req = new Request("https://fallback.example/api/admin");
      Netlify.env.get.mockReturnValueOnce(null);
      expect(siteBaseUrl(req, {})).toBe("https://fallback.example");
    });
  });

  describe("scheduleIsDue", () => {
    const schedule = {
      enabled: true,
      day_of_month: 20,
      send_hour: 9,
      timezone: "America/New_York",
      last_sent_at: null,
    };

    it("returns true on the configured day and hour", () => {
      const now = new Date("2026-07-20T13:00:00.000Z"); // 9 AM ET in summer
      expect(scheduleIsDue(schedule, now)).toBe(true);
    });

    it("returns false when disabled", () => {
      const now = new Date("2026-07-20T13:00:00.000Z");
      expect(scheduleIsDue({ ...schedule, enabled: false }, now)).toBe(false);
    });

    it("returns false if already sent this month", () => {
      const now = new Date("2026-07-20T13:00:00.000Z");
      expect(
        scheduleIsDue({ ...schedule, last_sent_at: "2026-07-20T14:00:00.000Z" }, now)
      ).toBe(false);
    });
  });

  describe("computeNextRunLabel", () => {
    it("returns a readable next-run label", () => {
      const label = computeNextRunLabel(
        { day_of_month: 20, send_hour: 9, timezone: "America/New_York" },
        new Date("2026-07-10T12:00:00.000Z")
      );
      expect(label).toMatch(/Jul 20, 2026 at 9:00 AM ET/);
    });
  });

  describe("zonedParts / sameMonthInTz", () => {
    it("extracts timezone-aware date parts", () => {
      const parts = zonedParts(new Date("2026-07-20T13:00:00.000Z"), "America/New_York");
      expect(parts.year).toBe(2026);
      expect(parts.month).toBe(7);
      expect(parts.day).toBe(20);
      expect(parts.hour).toBe(9);
    });

    it("compares months in the same timezone", () => {
      const a = new Date("2026-07-01T12:00:00.000Z");
      const b = new Date("2026-07-31T12:00:00.000Z");
      expect(sameMonthInTz(a, b, "America/New_York")).toBe(true);
    });
  });
});
