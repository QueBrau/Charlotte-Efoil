import axios from "axios";
import * as cheerio from "cheerio";

import { CONFIG } from "./config.mjs";
import { sleep } from "./utils.mjs";

function createClient() {
  return axios.create({
    baseURL: CONFIG.waydoo.baseUrl,
    timeout: CONFIG.download.timeoutMs,
    headers: {
      "User-Agent": CONFIG.waydoo.userAgent,
      Accept: "application/json,text/html,*/*",
    },
    validateStatus: (status) => status >= 200 && status < 400,
  });
}

/**
 * Discover all Waydoo products via the public Shopify JSON API.
 * Falls back to collection pagination when the global feed is capped.
 */
export async function crawlWaydooCatalog(logger) {
  const client = createClient();
  const products = new Map();
  const collections = [];

  logger.info("Discovering Waydoo collections");
  try {
    const { data } = await client.get(CONFIG.waydoo.collectionsJsonPath, {
      params: { limit: 250 },
    });
    for (const collection of data.collections || []) {
      collections.push(collection);
    }
  } catch (error) {
    logger.warn("Could not load collections.json", { error: error.message });
  }

  logger.info("Fetching global products.json feed");
  let page = 1;
  while (true) {
    try {
      const { data } = await client.get(CONFIG.waydoo.productsJsonPath, {
        params: { limit: CONFIG.waydoo.pageSize, page },
      });
      const batch = data.products || [];
      if (!batch.length) break;
      for (const product of batch) {
        products.set(product.handle, product);
      }
      logger.progress("Products.json page", page, page + (batch.length < CONFIG.waydoo.pageSize ? 0 : 1));
      if (batch.length < CONFIG.waydoo.pageSize) break;
      page += 1;
      await sleep(CONFIG.waydoo.requestDelayMs);
    } catch (error) {
      logger.pageFailed(`${CONFIG.waydoo.baseUrl}${CONFIG.waydoo.productsJsonPath}?page=${page}`, error.message);
      break;
    }
  }

  const relevantCollections = collections.filter((collection) => {
    const handle = collection.handle || "";
    return /flyer|evo|efoil|battery|wing|mast|propulsion|accessories|electric-hydrofoil|^all$/i.test(
      `${handle} ${collection.title}`,
    );
  });

  for (const collection of relevantCollections) {
    let collectionPage = 1;
    while (true) {
      const url = `/collections/${collection.handle}/products.json`;
      try {
        const { data } = await client.get(url, {
          params: { limit: CONFIG.waydoo.pageSize, page: collectionPage },
        });
        const batch = data.products || [];
        if (!batch.length) break;
        for (const product of batch) {
          products.set(product.handle, product);
        }
        if (batch.length < CONFIG.waydoo.pageSize) break;
        collectionPage += 1;
        await sleep(CONFIG.waydoo.requestDelayMs);
      } catch (error) {
        logger.pageFailed(`${CONFIG.waydoo.baseUrl}${url}`, error.message);
        break;
      }
    }
  }

  logger.info(`Discovered ${products.size} Waydoo products`);
  return { products, collections, client };
}

/**
 * Fetch individual product HTML for embedded videos not exposed in products.json.
 */
export async function fetchProductPageMedia(client, handle, logger) {
  const url = `/products/${handle}`;
  try {
    const { data: html } = await client.get(url, {
      headers: { Accept: "text/html" },
      responseType: "text",
    });
    return parseProductPageHtml(html);
  } catch (error) {
    logger.pageFailed(`${CONFIG.waydoo.baseUrl}${url}`, error.message);
    return { videos: [], extraImages: [] };
  }
}

function parseProductPageHtml(html) {
  const $ = cheerio.load(html);
  const videos = new Set();
  const extraImages = new Set();

  $("video source[src], video[src]").each((_, el) => {
    const src = $(el).attr("src");
    if (src) videos.add(src);
  });

  $('iframe[src*="youtube"], iframe[src*="vimeo"]').each((_, el) => {
    const src = $(el).attr("src");
    if (src) videos.add(src);
  });

  $("[data-video-url], [data-src-video]").each((_, el) => {
    const src = $(el).attr("data-video-url") || $(el).attr("data-src-video");
    if (src) videos.add(src);
  });

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).text());
      const nodes = Array.isArray(json) ? json : [json];
      for (const node of nodes) {
        if (node["@type"] === "VideoObject" && node.contentUrl) {
          videos.add(node.contentUrl);
        }
        if (node["@type"] === "Product" && Array.isArray(node.image)) {
          for (const image of node.image) extraImages.add(image);
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  });

  return {
    videos: [...videos],
    extraImages: [...extraImages],
  };
}

export function shouldSkipWaydooProduct(product) {
  const haystack = `${product.title} ${product.product_type} ${(product.tags || []).join(" ")}`;
  return CONFIG.skipProductPatterns.some((pattern) => pattern.test(haystack));
}
