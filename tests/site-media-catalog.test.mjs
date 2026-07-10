import { describe, expect, it } from "vitest";
import {
  SITE_MEDIA_ENTRIES,
  buildSiteMediaItems,
  isSiteMediaId,
  mergeMediaLibrary,
  siteMediaId,
  summarizeMedia,
} from "../js/site-media-catalog.js";

describe("site media catalog", () => {
  it("lists every public photo and video asset", () => {
    expect(SITE_MEDIA_ENTRIES).toHaveLength(10);
    const paths = SITE_MEDIA_ENTRIES.map((entry) => entry.path);
    expect(paths).toContain("photos/CharlotteEfoil.png");
    expect(paths).toContain("videos/hero-efoil.mp4");
    expect(paths).toContain("photos/5'2liftx.png");
    expect(paths).toContain("photos/blowfish.png");
  });

  it("builds stable site media ids and urls", () => {
    const items = buildSiteMediaItems();
    const logo = items.find((item) => item.original_filename === "CharlotteEfoil.png");
    expect(logo.id).toBe(siteMediaId("photos/CharlotteEfoil.png"));
    expect(items.every((item) => item.static && item.source === "site")).toBe(true);
    expect(items.find((item) => item.original_filename === "hero-efoil.mp4")?.url).toBe(
      "/videos/hero-efoil.mp4"
    );
  });

  it("detects site media ids", () => {
    expect(isSiteMediaId("site:photos/lakenorman.jpg")).toBe(true);
    expect(isSiteMediaId("a1000001-0000-4000-8000-000000000001")).toBe(false);
  });

  it("merges uploaded assets with site catalog", () => {
    const uploaded = [
      {
        id: "a1000001-0000-4000-8000-000000000001",
        name: "Newsletter banner",
        kind: "image",
        created_at: "2025-06-01T00:00:00.000Z",
        url: "https://site.test/api/media?id=a1000001-0000-4000-8000-000000000001",
      },
    ];
    const summary = mergeMediaLibrary(uploaded);
    expect(summary.total).toBe(11);
    expect(summary.items.some((item) => item.id === uploaded[0].id)).toBe(true);
    expect(summary.items.some((item) => item.url === "/videos/hero-efoil.mp4")).toBe(true);
  });

  it("dedupes site entries when an upload shares the same public path", () => {
    const uploaded = [
      {
        id: "a1000001-0000-4000-8000-000000000001",
        name: "Lake Norman copy",
        kind: "image",
        created_at: "2025-06-01T00:00:00.000Z",
        url: "/photos/lakenorman.jpg",
      },
    ];
    const summary = mergeMediaLibrary(uploaded);
    expect(summary.items.filter((item) => item.url === "/photos/lakenorman.jpg")).toHaveLength(1);
    expect(summary.total).toBe(10);
  });

  it("filters merged media by kind", () => {
    const summary = mergeMediaLibrary([], "video");
    expect(summary.total).toBe(2);
    expect(summary.videos).toBe(2);
    expect(summary.items.every((item) => item.kind === "video")).toBe(true);
  });

  it("summarizes counts by kind", () => {
    const summary = summarizeMedia(buildSiteMediaItems());
    expect(summary.total).toBe(10);
    expect(summary.images).toBe(7);
    expect(summary.videos).toBe(2);
    expect(summary.logos).toBe(1);
  });
});
