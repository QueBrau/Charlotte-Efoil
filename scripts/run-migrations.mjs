import { readFileSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const migrationsDir = resolve(root, "supabase/migrations");

function loadEnv() {
  const path = resolve(root, ".env");
  const text = readFileSync(path, "utf8");
  const env = {};
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
      console.log("Connected to database.");
      return client;
    } catch (err) {
      errors.push(`${url.replace(password, "***")}: ${err.message}`);
      await client.end().catch(() => {});
    }
  }
  throw new Error(`Could not connect to Supabase Postgres.\n${errors.join("\n")}`);
}

async function main() {
  const env = loadEnv();
  const ref = projectRef(env.SUPABASE_URL);
  const password = env.SUPABASE_DB_PASSWORD;
  const databaseUrl = env.DATABASE_URL || env.SUPABASE_DB_URL;
  if (!ref) throw new Error("SUPABASE_URL missing or invalid in .env");
  if (!databaseUrl && !password) {
    throw new Error("Add SUPABASE_DB_PASSWORD or DATABASE_URL to .env");
  }

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const client = await connect(ref, password, databaseUrl);
  await client.query(`
    create table if not exists public.schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const { rows: applied } = await client.query("select filename from public.schema_migrations");
  const done = new Set(applied.map((r) => r.filename));

  for (const file of files) {
    if (done.has(file)) {
      console.log(`skip ${file} (already applied)`);
      continue;
    }
    const sql = readFileSync(resolve(migrationsDir, file), "utf8");
    console.log(`apply ${file}...`);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into public.schema_migrations (filename) values ($1)", [file]);
      await client.query("commit");
      console.log(`ok   ${file}`);
    } catch (err) {
      await client.query("rollback");
      throw new Error(`${file} failed: ${err.message}`);
    }
  }

  await client.end();
  console.log("All migrations complete.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
