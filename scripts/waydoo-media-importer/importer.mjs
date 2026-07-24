import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { createClient } from "@supabase/supabase-js";

import { CONFIG } from "./config.mjs";
import { writeProductMediaSeedFile } from "./seed-sql.mjs";
import { downloadToFile, loadExistingHashes, runPool, saveVideoReference } from "./downloader.mjs";
import { writeCardThumb, writeProcessedImage } from "./image-processor.mjs";
import {
  ensureDir,
  isSupabaseConfigured,
  loadEnvFiles,
  publicUrlForSlug,
} from "./utils.mjs";

export async function materializeProductMedia(plan, logger, stats, { force = false } = {}) {
  const slugDirPublic = join(CONFIG.paths.publicProducts, plan.slug);
  const slugDirStore = join(CONFIG.paths.storePublicProducts, plan.slug);
  ensureDir(slugDirPublic);
  ensureDir(slugDirStore);

  const files = [];
  const mediaEntries = [];
  let heroBuffer = null;

  const imageJobs = [];
  if (plan.hero) imageJobs.push({ ...plan.hero, isHero: true, sortOrder: 1, isPrimary: true });
  for (const item of plan.gallery) {
    imageJobs.push({ ...item, isHero: false, isPrimary: false });
  }

  for (const job of imageJobs) {
    const publicPath = join(slugDirPublic, job.filename);
    const storePath = join(slugDirStore, job.filename);

    try {
      const result = await downloadToFile(job.sourceUrl, publicPath, logger, stats, { force });
      const processed = await writeProcessedImage(result.buffer, publicPath, { isHero: job.isHero });
      writeFileSync(storePath, processed);

      if (job.isHero) heroBuffer = processed;

      const url = publicUrlForSlug(plan.slug, job.filename);
      files.push({
        filename: job.filename,
        url,
        contentHash: result.contentHash,
        bytes: processed.length,
        skipped: result.skipped && !force,
      });

      mediaEntries.push({
        mediaType: "image",
        url,
        altText: job.alt,
        sortOrder: job.sortOrder,
        isPrimary: job.isPrimary,
      });
    } catch (error) {
      logger.error(`Failed image for ${plan.slug}`, { filename: job.filename, error: error.message });
    }
  }

  let cardUrl = null;
  if (heroBuffer) {
    const thumbPublic = join(slugDirPublic, "thumb.webp");
    const thumbStore = join(slugDirStore, "thumb.webp");
    try {
      const thumbBytes = await writeCardThumb(heroBuffer, thumbPublic);
      writeFileSync(thumbStore, readFileSync(thumbPublic));
      cardUrl = publicUrlForSlug(plan.slug, "thumb.webp");
      files.push({ filename: "thumb.webp", url: cardUrl, bytes: thumbBytes, skipped: false });
    } catch (error) {
      logger.warn(`Failed card thumb for ${plan.slug}`, { error: error.message });
      cardUrl = mediaEntries.find((entry) => entry.isPrimary)?.url || null;
    }
  }

  for (const [index, video] of plan.videos.entries()) {
    const refName = `video-${index + 1}.json`;
    const publicPath = join(slugDirPublic, refName);
    const storePath = join(slugDirStore, refName);
    saveVideoReference(publicPath, video);
    writeFileSync(storePath, readFileSync(publicPath));

    mediaEntries.push({
      mediaType: "video",
      url: video.url,
      altText: plan.title,
      sortOrder: plan.gallery.length + index + 2,
      isPrimary: false,
      referenceFile: publicUrlForSlug(plan.slug, refName),
    });
  }

  return {
    slug: plan.slug,
    title: plan.title,
    hero: mediaEntries.find((entry) => entry.isPrimary)?.url || null,
    card: cardUrl,
    gallery: mediaEntries.filter((entry) => entry.mediaType === "image" && !entry.isPrimary).map((entry) => entry.url),
    videos: plan.videos,
    media: mediaEntries,
    files,
  };
}

export async function writeManifest(manifest) {
  mkdirSync(CONFIG.paths.publicProducts, { recursive: true });
  writeFileSync(CONFIG.paths.manifest, JSON.stringify(manifest, null, 2));
}

export function integrateCatalogManifest(manifest, logger, stats) {
  const bySlug = Object.fromEntries(
    manifest.products.map((product) => [
      product.slug,
      {
        slug: product.slug,
        title: product.title,
        hero: product.hero,
        card: product.card ?? product.hero,
        gallery: product.gallery,
        videos: product.videos,
        media: product.media,
        updatedAt: manifest.generatedAt,
      },
    ]),
  );

  writeFileSync(CONFIG.paths.catalogManifest, JSON.stringify({ generatedAt: manifest.generatedAt, products: bySlug }, null, 2));
  stats.productsUpdated = manifest.products.filter((product) => product.hero).length;
  logger.info(`Updated catalog manifest with ${stats.productsUpdated} products`);
}

export function integrateSiteContent(manifest, logger) {
  integrateFleetImagesInFile(CONFIG.paths.siteContentSchema, manifest, logger, "site-content-schema.js");
  integrateFleetImagesInFile(CONFIG.paths.indexHtml, manifest, logger, "index.html");
}

function integrateFleetImagesInFile(filePath, manifest, logger, label) {
  if (!existsSync(filePath)) return;

  let source = readFileSync(filePath, "utf8");
  let changed = 0;

  for (const [slug, fleetKey] of Object.entries(CONFIG.fleetSlugs)) {
    const product = manifest.products.find((entry) => entry.slug === slug && entry.hero);
    if (!product) continue;

    const index = Number(fleetKey.split(".").pop());

    const fleetBlockPattern = new RegExp(
      `(fleet:\\s*\\[[\\s\\S]*?(?:\\{[\\s\\S]*?\\},\\s*){${index}}\\{[\\s\\S]*?image_src:\\s*")([^"]+)(")`,
    );
    const jsNext = source.replace(fleetBlockPattern, `$1${product.hero}$3`);

    const htmlPattern = new RegExp(
      `(data-cms-item="${index}"[\\s\\S]*?src=")([^"]+)(")`,
    );
    const htmlAltPattern = new RegExp(
      `(data-cms-item="${index}"[\\s\\S]*?alt=")([^"]+)(")`,
    );

    let next = jsNext;
    if (next === source) {
      next = source
        .replace(htmlPattern, `$1${product.hero}$3`)
        .replace(htmlAltPattern, `$1${product.title}$3`);
    }

    if (next !== source) {
      source = next;
      changed += 1;
    }
  }

  if (changed) {
    writeFileSync(filePath, source);
    logger.info(`Updated ${changed} fleet hero images in ${label}`);
  }
}

export function integrateSiteMediaCatalog(manifest, logger) {
  if (!existsSync(CONFIG.paths.siteMediaCatalog)) return;

  const source = readFileSync(CONFIG.paths.siteMediaCatalog, "utf8");
  const marker = "/** Auto-generated by waydoo-media-importer. Do not edit manually. */";
  if (source.includes(marker)) {
    logger.info("Site media catalog already contains importer block; skipping append");
    return;
  }

  const entries = manifest.products
    .filter((product) => product.hero)
    .map((product) => {
      const rel = product.hero.replace(/^\//, "");
      return `  {
    path: "${rel}",
    name: ${JSON.stringify(product.title)},
    original_filename: "hero.webp",
    content_type: "image/webp",
    kind: "image",
    size_bytes: 0,
    alt_text: ${JSON.stringify(product.title)},
    created_at: ${JSON.stringify(manifest.generatedAt)},
  }`;
    });

  if (!entries.length) return;

  const block = `\n${marker}\nexport const IMPORTED_PRODUCT_MEDIA = [\n${entries.join(",\n")},\n];\n`;
  writeFileSync(CONFIG.paths.siteMediaCatalog, `${source.trimEnd()}\n${block}\n`);
  logger.info(`Appended ${entries.length} entries to site-media-catalog.js`);
}

export function integrateSeedSql(manifest, logger) {
  writeProductMediaSeedFile(manifest, logger);
}

export async function integrateSupabase(manifest, logger) {
  const env = loadEnvFiles(CONFIG.supabase.envFiles);
  if (!isSupabaseConfigured(env)) {
    logger.info("Supabase not configured — using local product media paths");
    return;
  }

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await ensureStorageBucket(supabase, logger);

  for (const product of manifest.products) {
    const { data: dbProduct, error } = await supabase
      .from("products")
      .select("id, slug")
      .eq("slug", product.slug)
      .maybeSingle();

    if (error || !dbProduct) {
      logger.warn(`Supabase product not found for slug ${product.slug}`);
      continue;
    }

    await supabase.from("product_media").delete().eq("product_id", dbProduct.id);

    let sortOrder = 1;
    for (const entry of product.media) {
      let url = entry.url;

      if (entry.mediaType === "image") {
        const localPath = join(CONFIG.paths.storePublicProducts, product.slug, entry.url.split("/").pop());
        if (existsSync(localPath)) {
          const storagePath = `${product.slug}/${entry.url.split("/").pop()}`;
          const fileBuffer = readFileSync(localPath);
          const { error: uploadError } = await supabase.storage
            .from(CONFIG.supabase.bucket)
            .upload(storagePath, fileBuffer, { contentType: "image/webp", upsert: true });
          if (uploadError) {
            logger.error("Supabase upload failed", { path: storagePath, error: uploadError.message });
            continue;
          }
          const { data: publicData } = supabase.storage.from(CONFIG.supabase.bucket).getPublicUrl(storagePath);
          url = publicData.publicUrl;
        }
      }

      await supabase.from("product_media").insert({
        product_id: dbProduct.id,
        media_type: entry.mediaType,
        url,
        alt_text: entry.altText,
        sort_order: entry.sortOrder || sortOrder,
        is_primary: Boolean(entry.isPrimary),
      });
      sortOrder += 1;
    }
  }

  logger.info("Supabase product_media updated from imported assets");
}

async function ensureStorageBucket(supabase, logger) {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some((bucket) => bucket.name === CONFIG.supabase.bucket);
  if (exists) return;

  const { error } = await supabase.storage.createBucket(CONFIG.supabase.bucket, {
    public: true,
    fileSizeLimit: 20 * 1024 * 1024,
  });
  if (error) logger.warn("Could not create Supabase storage bucket", { error: error.message });
}

export function bootstrapManifestLoader() {
  loadExistingHashes(CONFIG.paths.manifest);
}

export async function processPlansInParallel(plans, logger, stats, options = {}) {
  return runPool(plans, (plan) => materializeProductMedia(plan, logger, stats, options));
}
