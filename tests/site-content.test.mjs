import { describe, expect, it } from "vitest";
import {
  CONTENT_SLUGS,
  DEFAULT_SITE_CONTENT,
  deepMerge,
  mergePageContent,
  resolveContentPath,
  isContentSlug,
} from "../js/site-content-schema.js";
import {
  getPublishedPages,
  mergePageContent as serverMerge,
  isContentSlug as serverIsSlug,
} from "../netlify/functions/_shared/site-content.mjs";

describe("site content schema", () => {
  it("defines all expected page slugs", () => {
    expect(CONTENT_SLUGS).toEqual(["global", "home", "about", "contact", "lessons", "reservations"]);
    expect(CONTENT_SLUGS.every(isContentSlug)).toBe(true);
    expect(isContentSlug("unknown")).toBe(false);
  });

  it("has defaults for every slug", () => {
    for (const slug of CONTENT_SLUGS) {
      expect(DEFAULT_SITE_CONTENT[slug]).toBeTruthy();
      expect(mergePageContent(slug, {})).toEqual(DEFAULT_SITE_CONTENT[slug]);
    }
  });

  it("deep merges nested objects and arrays", () => {
    const merged = deepMerge(
      { hero: { title: "A" }, tags: ["one"] },
      { hero: { lead: "B" }, tags: ["two", "three"] }
    );
    expect(merged).toEqual({
      hero: { title: "A", lead: "B" },
      tags: ["two", "three"],
    });
  });

  it("resolves dotted and indexed paths", () => {
    const home = DEFAULT_SITE_CONTENT.home;
    expect(resolveContentPath(home, "hero.title")).toBe(home.hero.title);
    expect(resolveContentPath(home, "fleet.0.title")).toBe(home.fleet[0].title);
  });
});

describe("site content server helpers", () => {
  it("re-exports schema helpers", () => {
    expect(serverIsSlug("home")).toBe(true);
    expect(serverMerge("home", { hero: { title: "Custom" } }).hero.title).toBe("Custom");
    expect(serverMerge("home", { hero: { title: "Custom" } }).hero.eyebrow).toBe(
      DEFAULT_SITE_CONTENT.home.hero.eyebrow
    );
  });

  it("getPublishedPages merges defaults for missing rows", async () => {
    const supabase = {
      from() {
        return {
          select(cols) {
            if (cols === "slug") {
              return Promise.resolve({
                data: CONTENT_SLUGS.map((slug) => ({ slug })),
                error: null,
              });
            }
            return {
              in() {
                return Promise.resolve({
                  data: [{ slug: "home", published: { hero: { title: "Live title" } } }],
                  error: null,
                });
              },
            };
          },
        };
      },
    };

    const result = await getPublishedPages(supabase, ["home", "global"]);
    expect(result.pages.home.hero.title).toBe("Live title");
    expect(result.pages.home.hero.eyebrow).toBe(DEFAULT_SITE_CONTENT.home.hero.eyebrow);
    expect(result.pages.global.phone).toBe(DEFAULT_SITE_CONTENT.global.phone);
  });
});
