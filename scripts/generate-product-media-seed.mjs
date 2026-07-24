#!/usr/bin/env node

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

import { CONFIG } from "./waydoo-media-importer/config.mjs";
import { buildProductMediaSeedSql } from "./waydoo-media-importer/seed-sql.mjs";

const manifestPath = process.argv.includes("--manifest")
  ? process.argv[process.argv.indexOf("--manifest") + 1]
  : CONFIG.paths.catalogManifest;

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const products = Array.isArray(manifest.products)
  ? manifest.products
  : Object.values(manifest.products ?? {});

const normalized = {
  generatedAt: manifest.generatedAt ?? new Date().toISOString(),
  products,
};

const sql = buildProductMediaSeedSql(normalized);
writeFileSync(CONFIG.paths.productMediaSeedSql, sql);

const rowCount = products.reduce((total, product) => total + (product.media?.length ?? 0), 0);
console.log(`Wrote ${CONFIG.paths.productMediaSeedSql}`);
console.log(`${products.length} products, ${rowCount} media rows`);
