import { CONFIG } from "./config.mjs";
import { maxResolutionShopifyUrl, normalizeMediaUrl } from "./utils.mjs";

export function parseWaydooProductImages(product, pageExtras = { extraImages: [] }) {
  const seen = new Set();
  const candidates = [];

  for (const image of product.images || []) {
    const url = maxResolutionShopifyUrl(image.src, CONFIG.download.shopifyMaxWidth);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    candidates.push({
      url,
      width: image.width || 0,
      height: image.height || 0,
      position: image.position || candidates.length + 1,
      alt: product.title,
      source: "shopify-json",
    });
  }

  for (const url of pageExtras.extraImages || []) {
    const normalized = normalizeMediaUrl(url, CONFIG.waydoo.baseUrl);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    candidates.push({
      url: maxResolutionShopifyUrl(normalized, CONFIG.download.shopifyMaxWidth),
      width: 0,
      height: 0,
      position: candidates.length + 1,
      alt: product.title,
      source: "html",
    });
  }

  return filterProductImages(candidates);
}

export function parseWaydooProductVideos(product, pageExtras = { videos: [] }) {
  const videos = [];
  const seen = new Set();

  for (const url of pageExtras.videos || []) {
    const normalized = normalizeMediaUrl(url, CONFIG.waydoo.baseUrl);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    videos.push({
      url: normalized,
      title: product.title,
      type: inferVideoType(normalized),
    });
  }

  return videos;
}

export function filterProductImages(images) {
  return rankProductImages(images).slice(0, CONFIG.download.maxGalleryImages);
}

/** Prefer Shopify primary product shots over feature/lifestyle graphics. */
export function rankProductImages(images) {
  return images
    .filter((image) => !shouldSkipImageUrl(image.url))
    .filter((image) => {
      if (!image.width && !image.height) return true;
      return (
        image.width >= CONFIG.download.minImageWidth &&
        image.height >= CONFIG.download.minImageHeight
      );
    })
    .sort((a, b) => scoreProductImage(b) - scoreProductImage(a));
}

function scoreProductImage(image) {
  const url = image.url.toLowerCase();
  const filename = url.split("/").pop()?.split("?")[0] ?? url;

  // Shopify position 1 is usually the catalog product shot.
  let score = 2000 - (image.position || 99) * 100;

  if (/(?:^|[-_])main(?:[-_.]|$)|mainimage|packshot|product[-_]?shot|hero/i.test(filename)) {
    score += 800;
  }
  if (/\b(board|battery|mast|wing|propulsion|controller|charger|bag|vest|helmet|remote)\b/i.test(filename)) {
    score += 120;
  }
  if (/feature|performance-feature|lifestyle|banner|scene|riding|action|exploded|diagram|spec|infographic|comparison|chart/i.test(filename)) {
    score -= 500;
  }

  // Slightly prefer square packshots over wide banners.
  if (image.width && image.height) {
    const ratio = image.width / image.height;
    if (ratio >= 0.85 && ratio <= 1.2) score += 80;
    if (ratio > 1.8) score -= 120;
  }

  return score;
}

export function shouldSkipImageUrl(url) {
  return CONFIG.skipUrlPatterns.some((pattern) => pattern.test(url));
}

function inferVideoType(url) {
  if (/youtube|youtu\.be|vimeo|firework/i.test(url)) return "embed";
  if (/\.mp4|\.webm|\.mov/i.test(url)) return "file";
  return "url";
}

export function buildCatalogMediaPlan(catalogSlug, productTitle, images, videos) {
  const hero = images[0] || null;
  const gallery = images.slice(1);

  return {
    slug: catalogSlug,
    title: productTitle,
    hero: hero
      ? {
          sourceUrl: hero.url,
          filename: "hero.webp",
          alt: productTitle,
        }
      : null,
    gallery: gallery.map((image, index) => ({
      sourceUrl: image.url,
      filename: `gallery-${index + 1}.webp`,
      alt: productTitle,
      sortOrder: index + 2,
    })),
    videos: videos.map((video, index) => ({
      url: video.url,
      type: video.type,
      filename: `video-${index + 1}.json`,
      sortOrder: index + 1,
    })),
  };
}
