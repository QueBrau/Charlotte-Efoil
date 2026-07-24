import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, "../..");

export const CONFIG = {
  waydoo: {
    baseUrl: "https://www.waydoo.com",
    productsJsonPath: "/products.json",
    collectionsJsonPath: "/collections.json",
    userAgent: "CharlotteEfoilMediaImporter/1.0 (+https://charlotteefoil.com)",
    pageSize: 250,
    requestDelayMs: 250,
  },

  paths: {
    publicProducts: resolve(ROOT, "public/products"),
    storePublicProducts: resolve(ROOT, "store/public/products"),
    manifest: resolve(ROOT, "public/products/manifest.json"),
    catalogManifest: resolve(ROOT, "store/src/lib/catalog/product-media-manifest.json"),
    demoData: resolve(ROOT, "store/src/lib/catalog/demo-data.ts"),
    seedSql: resolve(ROOT, "store/supabase/seed/001_waydoo_catalog.sql"),
    productMediaSeedSql: resolve(ROOT, "store/supabase/seed/002_product_media_import.sql"),
    siteContentSchema: resolve(ROOT, "js/site-content-schema.js"),
    siteMediaCatalog: resolve(ROOT, "js/site-media-catalog.js"),
    indexHtml: resolve(ROOT, "index.html"),
    logFile: resolve(ROOT, "public/products/import.log.json"),
  },

  download: {
    maxRetries: 3,
    retryDelayMs: 1500,
    timeoutMs: 60000,
    maxConcurrent: 4,
    minImageWidth: 400,
    minImageHeight: 400,
    maxGalleryImages: 12,
    shopifyMaxWidth: 4096,
  },

  image: {
    format: "webp",
    quality: 82,
    heroMaxSize: 1400,
    galleryMaxSize: 1200,
    cardThumbMaxSize: 480,
  },

  supabase: {
    bucket: "product-media",
    envFiles: [
      resolve(ROOT, "store/.env.local"),
      resolve(ROOT, "store/.env"),
      resolve(ROOT, ".env"),
    ],
  },

  /** Filename / URL substrings that indicate non-product imagery. */
  skipUrlPatterns: [
    /logo/i,
    /icon/i,
    /badge/i,
    /payment/i,
    /paypal/i,
    /visa/i,
    /mastercard/i,
    /amex/i,
    /social/i,
    /facebook/i,
    /instagram/i,
    /twitter/i,
    /tiktok/i,
    /youtube/i,
    /banner/i,
    /nav/i,
    /menu/i,
    /sprite/i,
    /placeholder/i,
    /favicon/i,
    /avatar/i,
    /trust/i,
    /shipping/i,
    /warranty-badge/i,
    /app-store/i,
    /google-play/i,
    /flag/i,
    /arrow/i,
    /chevron/i,
    /cart/i,
    /checkout/i,
    /reward/i,
    /points/i,
    /gift-card/i,
  ],

  /** Product types / tags to ignore when crawling Waydoo catalog. */
  skipProductPatterns: [
    /^xtra/i,
    /^subnado/i,
    /foilboost/i,
    /scooter(?! kit)/i,
    /trudive/i,
    /camera/i,
    /action cam/i,
    /reward/i,
    /points/i,
  ],

  fleetSlugs: {
    "flyer-evo-max-plus-package": "home.fleet.0",
    "flyer-evo-pro-plus-package": "home.fleet.1",
    "flyer-evo-lite-package": "home.fleet.2",
  },
};
