/**
 * Applique la migration V2 (automations + intake) via le pooler Postgres.
 * Usage: node scripts/apply-v2-automations-intake.mjs
 * Requiert .env.local : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_DB_PASSWORD
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      const key = t.slice(0, i).trim();
      const val = t.slice(i + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    /* ignore */
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const PROJECT_REF = SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

const MIGRATION_SQL = readFileSync(
  resolve(root, "supabase/migrations/20260701120000_v2_automations_intake.sql"),
  "utf8",
);

async function runSqlViaPooler(sql) {
  if (!DB_PASSWORD || !PROJECT_REF) {
    return { ok: false, reason: "SUPABASE_DB_PASSWORD manquant" };
  }
  const { default: pg } = await import("pg");
  const hosts = [
    `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASSWORD)}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASSWORD)}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres:${encodeURIComponent(DB_PASSWORD)}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
  ];
  let lastErr;
  for (const connectionString of hosts) {
    const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      await client.query(sql);
      await client.end();
      return { ok: true, host: connectionString.split("@")[1] };
    } catch (e) {
      lastErr = e;
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }
  return { ok: false, reason: lastErr?.message ?? "connexion pooler impossible" };
}

async function main() {
  console.log("=== V2 automations + intake — migration ===\n");
  if (!SUPABASE_URL) {
    console.error("NEXT_PUBLIC_SUPABASE_URL requis dans .env.local");
    process.exit(1);
  }
  const applied = await runSqlViaPooler(MIGRATION_SQL);
  if (!applied.ok) {
    console.log("Échec:", applied.reason);
    console.log("\n→ Appliquez via Supabase MCP / SQL Editor :");
    console.log("  supabase/migrations/20260701120000_v2_automations_intake.sql");
    process.exit(1);
  }
  console.log("✅ Migration appliquée via", applied.host);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
