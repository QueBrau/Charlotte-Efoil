#!/usr/bin/env node

import { readFileSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const storeDir = resolve(root, "store");
const migrationsDir = resolve(storeDir, "supabase/migrations");
const seedsDir = resolve(storeDir, "supabase/seed");

function loadEnvFiles() {
  const env = {};
  for (const file of [resolve(root, ".env"), resolve(storeDir, ".env.local"), resolve(storeDir, ".env")]) {
    try {
      const text = readFileSync(file, "utf8");
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[key] = val;
      }
    } catch {
      // optional env file
    }
  }
  return env;
}

function projectRef(url) {
  const match = url?.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] || null;
}

function connectionCandidates(ref, password) {
  const enc = encodeURIComponent(password);
  const regions = [
    "us-east-1",
    "us-east-2",
    "us-west-1",
    "us-west-2",
    "eu-west-1",
    "eu-west-2",
    "eu-central-1",
    "eu-central-2",
    "eu-north-1",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-northeast-1",
    "ap-northeast-2",
    "ap-south-1",
    "ca-central-1",
    "sa-east-1",
  ];
  const urls = [];
  for (const region of regions) {
    urls.push(`postgresql://postgres.${ref}:${enc}@aws-0-${region}.pooler.supabase.com:6543/postgres`);
    urls.push(`postgresql://postgres.${ref}:${enc}@aws-0-${region}.pooler.supabase.com:5432/postgres`);
  }
  urls.push(`postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres`);
  urls.push(`postgresql://postgres:${enc}@db.${ref}.supabase.co:6543/postgres`);
  return urls;
}

async function connect(ref, password, databaseUrl) {
  const errors = [];
  const urls = databaseUrl ? [databaseUrl] : connectionCandidates(ref, password);
  for (const url of urls) {
    const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      console.log("Connected to Supabase Postgres.");
      return client;
    } catch (err) {
      errors.push(`${url.replace(password, "***")}: ${err.message}`);
      await client.end().catch(() => {});
    }
  }
  throw new Error(`Could not connect to Supabase Postgres.\n${errors.join("\n")}`);
}

async function applySqlFile(client, label, filePath, trackingTable, filename) {
  const sql = readFileSync(filePath, "utf8");
  console.log(`apply ${label}...`);
  await client.query("begin");
  try {
    await client.query(sql);
    await client.query(`insert into public.${trackingTable} (filename) values ($1) on conflict (filename) do nothing`, [
      filename,
    ]);
    await client.query("commit");
    console.log(`ok   ${label}`);
  } catch (err) {
    await client.query("rollback");
    throw new Error(`${label} failed: ${err.message}`);
  }
}

async function main() {
  const env = loadEnvFiles();
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const ref = projectRef(supabaseUrl);
  const password = env.SUPABASE_DB_PASSWORD;
  const databaseUrl = env.DATABASE_URL || env.SUPABASE_DB_URL;

  if (!ref) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL in .env");
  if (!databaseUrl && !password) {
    throw new Error("Set SUPABASE_DB_PASSWORD or DATABASE_URL in .env");
  }

  const migrationFiles = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const seedFiles = readdirSync(seedsDir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const client = await connect(ref, password, databaseUrl);

  await client.query(`
    create table if not exists public.store_schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    );
  `);
  await client.query(`
    create table if not exists public.store_seed_runs (
      filename text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const { rows: appliedMigrations } = await client.query(
    "select filename from public.store_schema_migrations",
  );
  const doneMigrations = new Set(appliedMigrations.map((row) => row.filename));

  for (const file of migrationFiles) {
    if (doneMigrations.has(file)) {
      console.log(`skip migration ${file} (already applied)`);
      continue;
    }
    await applySqlFile(
      client,
      `migration ${file}`,
      resolve(migrationsDir, file),
      "store_schema_migrations",
      file,
    );
  }

  const { rows: appliedSeeds } = await client.query("select filename from public.store_seed_runs");
  const doneSeeds = new Set(appliedSeeds.map((row) => row.filename));

  for (const file of seedFiles) {
    const alwaysReapply = file.startsWith("002_");
    if (doneSeeds.has(file) && !alwaysReapply) {
      console.log(`skip seed ${file} (already applied)`);
      continue;
    }
    await applySqlFile(client, `seed ${file}`, resolve(seedsDir, file), "store_seed_runs", file);
  }

  const { rows: counts } = await client.query(`
    select
      (select count(*)::int from public.products) as products,
      (select count(*)::int from public.product_media) as product_media,
      (select count(*)::int from public.categories) as categories
  `);
  console.log("Catalog counts:", counts[0]);

  await client.end();
  console.log("Store database migrations and seeds complete.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
