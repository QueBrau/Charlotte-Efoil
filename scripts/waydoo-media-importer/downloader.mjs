import { createWriteStream, existsSync, readFileSync, writeFileSync } from "fs";
import { pipeline } from "stream/promises";
import axios from "axios";

import { CONFIG } from "./config.mjs";
import { hashBuffer, sleep } from "./utils.mjs";

const contentHashes = new Set();

export function loadExistingHashes(manifestPath) {
  if (!existsSync(manifestPath)) return;
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    for (const product of manifest.products || []) {
      for (const file of product.files || []) {
        if (file.contentHash) contentHashes.add(file.contentHash);
      }
    }
  } catch {
    // fresh import
  }
}

export async function downloadBinary(url, logger) {
  let lastError;
  for (let attempt = 1; attempt <= CONFIG.download.maxRetries; attempt += 1) {
    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: CONFIG.download.timeoutMs,
        headers: { "User-Agent": CONFIG.waydoo.userAgent },
        maxRedirects: 5,
      });
      return Buffer.from(response.data);
    } catch (error) {
      lastError = error;
      logger.warn(`Download attempt ${attempt} failed`, { url, error: error.message });
      if (attempt < CONFIG.download.maxRetries) {
        await sleep(CONFIG.download.retryDelayMs * attempt);
      }
    }
  }
  throw lastError;
}

export async function downloadToFile(url, destPath, logger, stats, { force = false } = {}) {
  if (!force && existsSync(destPath)) {
    stats.imagesSkipped += 1;
    const existing = readFileSync(destPath);
    const hash = hashBuffer(existing);
    contentHashes.add(hash);
    return { skipped: true, contentHash: hash, buffer: existing };
  }

  const buffer = await downloadBinary(url, logger);
  const contentHash = hashBuffer(buffer);

  if (!force && contentHashes.has(contentHash)) {
    stats.imagesSkipped += 1;
    return { skipped: true, duplicate: true, contentHash, buffer };
  }

  contentHashes.add(contentHash);
  await pipeline(
    async function* () {
      yield buffer;
    },
    createWriteStream(destPath),
  );

  stats.imagesDownloaded += 1;
  return { skipped: false, contentHash, buffer };
}

export async function runPool(items, worker, concurrency = CONFIG.download.maxConcurrent) {
  const results = new Array(items.length);
  let index = 0;

  async function next() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await worker(items[current], current);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => next()));
  return results;
}

export function saveVideoReference(destPath, video) {
  writeFileSync(
    destPath,
    JSON.stringify(
      {
        url: video.url,
        type: video.type,
        title: video.title,
        importedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}
