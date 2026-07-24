import { existsSync, writeFileSync } from "fs";
import sharp from "sharp";

import { CONFIG } from "./config.mjs";

/**
 * Convert downloaded image buffers to optimized WebP while preserving alpha.
 */
export async function processImageBuffer(buffer, { isHero = false } = {}) {
  const maxSize = isHero ? CONFIG.image.heroMaxSize : CONFIG.image.galleryMaxSize;
  let pipeline = sharp(buffer, { failOn: "none" }).rotate();

  const metadata = await pipeline.metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;

  if (width > maxSize || height > maxSize) {
    pipeline = pipeline.resize({
      width: width >= height ? maxSize : undefined,
      height: height > width ? maxSize : undefined,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  const hasAlpha = metadata.hasAlpha || metadata.channels === 4;
  return pipeline
    .webp({
      quality: CONFIG.image.quality,
      alphaQuality: hasAlpha ? CONFIG.image.quality : undefined,
      effort: 4,
    })
    .toBuffer();
}

export async function writeProcessedImage(buffer, destPath, options) {
  const processed = await processImageBuffer(buffer, options);
  writeFileSync(destPath, processed);
  return processed;
}

export async function writeCardThumb(buffer, destPath) {
  const maxSize = CONFIG.image.cardThumbMaxSize;
  const processed = await sharp(buffer, { failOn: "none" })
    .rotate()
    .resize({
      width: maxSize,
      height: maxSize,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 78, effort: 4 })
    .toBuffer();
  writeFileSync(destPath, processed);
  return processed.length;
}

export async function ensureProcessedImage(sourcePath, destPath, options) {
  if (existsSync(destPath)) {
    return { skipped: true };
  }
  const { readFileSync } = await import("fs");
  const size = await writeProcessedImage(readFileSync(sourcePath), destPath, options);
  return { skipped: false, size };
}
