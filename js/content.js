import { resolveContentPath, phoneDigits } from "./site-content-schema.js";

const API_BASE = window.CE_API_BASE || "/api";

const PAGE_SLUG_MAP = {
  welcome: "home",
  about: "about",
  contact: "contact",
  "flight-lessons": "lessons",
  "reservation-request": "reservations",
};

let cachedPages = {};

function parseCmsPath(attr) {
  const dot = attr.indexOf(".");
  if (dot < 1) return { slug: attr, path: "" };
  return { slug: attr.slice(0, dot), path: attr.slice(dot + 1) };
}

function readValue(attr) {
  const { slug, path } = parseCmsPath(attr);
  return resolveContentPath(cachedPages[slug], path);
}

function applyTextBindings() {
  document.querySelectorAll("[data-cms-text]").forEach((el) => {
    const val = readValue(el.dataset.cmsText);
    if (val != null && val !== "") el.textContent = val;
  });
}

function applyHtmlBindings() {
  document.querySelectorAll("[data-cms-html]").forEach((el) => {
    const val = readValue(el.dataset.cmsHtml);
    if (val != null && val !== "") el.innerHTML = val;
  });
}

function applySrcBindings() {
  document.querySelectorAll("[data-cms-src]").forEach((el) => {
    const val = readValue(el.dataset.cmsSrc);
    if (!val) return;
    if (el.tagName === "VIDEO") {
      el.src = val;
      el.load?.();
      return;
    }
    if (el.tagName === "SOURCE") {
      el.setAttribute("src", val);
      el.parentElement?.load?.();
      return;
    }
    el.setAttribute("src", val);
    if (el.tagName === "IMG" && el.dataset.cmsAlt) {
      const alt = readValue(el.dataset.cmsAlt);
      if (alt) el.alt = alt;
    }
  });
}

function applyAttrBindings() {
  document.querySelectorAll("[data-cms-attr]").forEach((el) => {
    const spec = el.dataset.cmsAttr || "";
    const colon = spec.indexOf(":");
    if (colon < 1) return;
    const attr = spec.slice(0, colon).trim();
    const val = readValue(spec.slice(colon + 1).trim());
    if (val != null && val !== "") el.setAttribute(attr, val);
  });
}

function applyHrefBindings() {
  document.querySelectorAll("[data-cms-href]").forEach((el) => {
    const path = el.dataset.cmsHref;
    const val = readValue(path);
    if (!val) return;
    if (path.endsWith(".phone")) {
      el.setAttribute("href", `tel:${phoneDigits(val)}`);
      return;
    }
    if (path.endsWith(".email")) {
      el.setAttribute("href", `mailto:${val}`);
      return;
    }
    el.setAttribute("href", val);
  });
}

function applyMetaBindings() {
  document.querySelectorAll("[data-cms-meta]").forEach((el) => {
    const val = readValue(el.dataset.cmsMeta);
    if (val) el.setAttribute("content", val);
  });
}

function applyListBindings() {
  document.querySelectorAll("[data-cms-list]").forEach((container) => {
    const items = readValue(container.dataset.cmsList);
    if (!Array.isArray(items)) return;

    container.querySelectorAll("[data-cms-item]").forEach((itemEl) => {
      const idx = Number(itemEl.dataset.cmsItem);
      const item = items[idx];
      if (!item) return;

      const fields = itemEl.matches("[data-cms-field]")
        ? [itemEl, ...itemEl.querySelectorAll("[data-cms-field]")]
        : [...itemEl.querySelectorAll("[data-cms-field]")];

      fields.forEach((field) => {
        const key = field.dataset.cmsField;
        const val = item[key];
        if (val == null) return;

        const attr = field.dataset.cmsAttr;
        if (attr === "src" || field.tagName === "IMG") {
          field.setAttribute("src", val);
          if (item.image_alt) field.alt = item.image_alt;
          return;
        }
        if (attr === "href") {
          field.setAttribute("href", val);
          return;
        }
        if (field.tagName === "UL" && Array.isArray(val)) {
          field.innerHTML = val.map((line) => `<li>${line}</li>`).join("");
          return;
        }
        field.textContent = val;
      });
    });
  });
}

function applyLineListBindings() {
  document.querySelectorAll("[data-cms-lines]").forEach((el) => {
    const items = readValue(el.dataset.cmsLines);
    if (!Array.isArray(items)) return;
    const lis = el.querySelectorAll("li");
    items.forEach((text, i) => {
      if (lis[i]) lis[i].textContent = text;
    });
  });
}

function applyContentBindings() {
  applyTextBindings();
  applyHtmlBindings();
  applySrcBindings();
  applyAttrBindings();
  applyHrefBindings();
  applyMetaBindings();
  applyListBindings();
  applyLineListBindings();
}

export function getPublishedPage(slug) {
  return cachedPages[slug] || null;
}

export async function initSiteContent(activePage) {
  const cmsSlug = PAGE_SLUG_MAP[activePage] || activePage;
  const slugs = ["global"];
  if (cmsSlug && cmsSlug !== "global") slugs.push(cmsSlug);

  try {
    const res = await fetch(`${API_BASE}/content?pages=${slugs.join(",")}`);
    if (res.ok) {
      const data = await res.json();
      cachedPages = data.pages || {};
    }
  } catch {
    cachedPages = {};
  }

  applyContentBindings();
  return cachedPages;
}
