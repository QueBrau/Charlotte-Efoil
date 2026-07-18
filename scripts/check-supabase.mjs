import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const text = readFileSync(resolve(root, ".env"), "utf8");
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

const EXPECTED_TABLES = [
  "leads",
  "visitors",
  "sessions",
  "page_views",
  "events",
  "contact_submissions",
  "reservation_requests",
  "interest_types",
  "email_campaigns",
  "email_schedules",
  "email_sends",
];

async function main() {
  const env = loadEnv();
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const checks = [];

  for (const table of EXPECTED_TABLES) {
    const { error, count } = await supabase.from(table).select("*", { count: "exact", head: true });
    checks.push({
      table,
      ok: !error,
      error: error?.message || null,
      rows: count ?? 0,
    });
  }

  const { data: rpcData, error: rpcError } = await supabase.rpc("admin_dashboard", { p_days: 7 });

  const tableOk = checks.filter((c) => c.ok).length;
  const tableFail = checks.filter((c) => !c.ok);

  console.log("Supabase connection: OK");
  console.log(`Project URL: ${url}`);
  console.log(`Tables reachable: ${tableOk}/${EXPECTED_TABLES.length}`);
  for (const c of checks) {
    console.log(`  ${c.ok ? "✓" : "✗"} ${c.table}${c.ok ? ` (${c.rows} rows)` : ` — ${c.error}`}`);
  }

  if (rpcError) {
    console.log(`admin_dashboard RPC: FAIL — ${rpcError.message}`);
  } else {
    const kpis = rpcData?.kpis || rpcData;
    console.log("admin_dashboard RPC: OK");
    if (kpis) {
      console.log(`  sessions (7d): ${kpis.sessions ?? kpis.total_sessions ?? "n/a"}`);
      console.log(`  unique visitors (7d): ${kpis.unique_visitors ?? "n/a"}`);
    }
  }

  if (tableFail.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Supabase connection: FAIL");
  console.error(err.message || err);
  process.exit(1);
});
