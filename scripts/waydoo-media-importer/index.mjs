#!/usr/bin/env node

import {
  crawlWaydooCatalog,
  fetchProductPageMedia,
  shouldSkipWaydooProduct,
} from "./crawler.mjs";
import { CONFIG } from "./config.mjs";
import {
  bootstrapManifestLoader,
  integrateCatalogManifest,
  integrateSiteContent,
  integrateSiteMediaCatalog,
  integrateSeedSql,
  integrateSupabase,
  processPlansInParallel,
  writeManifest,
} from "./importer.mjs";
import { Logger } from "./logger.mjs";
import {
  buildCatalogMediaPlan,
  parseWaydooProductImages,
  parseWaydooProductVideos,
} from "./parser.mjs";
import {
  CATALOG_SLUGS,
  pickWaydooProductForSlug,
  resolveCatalogSlug,
  SLUG_TO_WAYDOO_HANDLES,
} from "./slug-map.mjs";
import { sleep } from "./utils.mjs";

async function main() {
  const forceRefresh = process.argv.includes("--refresh");
  const logger = new Logger();
  bootstrapManifestLoader();

  console.log("Waydoo product media importer");
  if (forceRefresh) console.log("Mode: refresh (re-download and rebuild all images)");
  console.log(`Source: ${CONFIG.waydoo.baseUrl}`);
  console.log(`Output: ${CONFIG.paths.publicProducts}\n`);

  const { products: waydooProducts, client } = await crawlWaydooCatalog(logger);
  const waydooByHandle = new Map(waydooProducts);
  const pageCache = new Map();

  async function getPageExtras(handle) {
    if (pageCache.has(handle)) return pageCache.get(handle);
    const extras = await fetchProductPageMedia(client, handle, logger);
    pageCache.set(handle, extras);
    await sleep(CONFIG.waydoo.requestDelayMs);
    return extras;
  }

  const plansBySlug = new Map();

  // Pass 1: explicit catalog slug → Waydoo handle mapping
  for (const slug of CATALOG_SLUGS) {
    const waydooProduct = pickWaydooProductForSlug(slug, waydooByHandle);
    if (!waydooProduct) continue;

    const pageExtras = await getPageExtras(waydooProduct.handle);
    const images = parseWaydooProductImages(waydooProduct, pageExtras);
    const videos = parseWaydooProductVideos(waydooProduct, pageExtras);
    if (!images.length) {
      logger.warn(`No usable images for catalog slug ${slug}`, { handle: waydooProduct.handle });
      continue;
    }

    plansBySlug.set(
      slug,
      buildCatalogMediaPlan(slug, waydooProduct.title, images, videos),
    );
  }

  // Pass 2: discover additional matches from crawled catalog
  for (const product of waydooProducts.values()) {
    if (shouldSkipWaydooProduct(product)) continue;
    const slug = resolveCatalogSlug(product);
    if (!slug || plansBySlug.has(slug)) continue;

    const pageExtras = await getPageExtras(product.handle);
    const images = parseWaydooProductImages(product, pageExtras);
    if (!images.length) continue;

    const videos = parseWaydooProductVideos(product, pageExtras);
    plansBySlug.set(slug, buildCatalogMediaPlan(slug, product.title, images, videos));
  }

  const plans = [...plansBySlug.values()];
  logger.stats.productsProcessed = plans.length;
  console.log(`\nPrepared media plans for ${plans.length} catalog products`);

  const manifestProducts = await processPlansInParallel(plans, logger, logger.stats, {
    force: forceRefresh,
  });
  const manifest = {
    generatedAt: new Date().toISOString(),
    source: CONFIG.waydoo.baseUrl,
    products: manifestProducts.filter((product) => product.hero || product.gallery.length),
    mapping: Object.fromEntries(
      CATALOG_SLUGS.map((slug) => [slug, SLUG_TO_WAYDOO_HANDLES[slug] || []]),
    ),
  };

  await writeManifest(manifest);
  integrateCatalogManifest(manifest, logger, logger.stats);
  integrateSiteContent(manifest, logger);
  integrateSiteMediaCatalog(manifest, logger);
  integrateSeedSql(manifest, logger);
  await integrateSupabase(manifest, logger);

  logger.flush();
  logger.printSummary();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
