/**
 * Applique la migration synchronisation agenda Outlook (pooler Postgres).
 * Usage: node scripts/apply-outlook-calendar-sync.mjs
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
  resolve(root, "supabase/migrations/20260630120000_outlook_calendar_sync.sql"),
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

async function verifyTablesViaServiceRole() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !serviceKey) return { ok: false, reason: "clé service_role manquante" };
  const tables = ["outlook_connections", "outlook_calendar_events"];
  for (const table of tables) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=0`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, reason: `${table}: ${body}` };
    }
  }
  return { ok: true };
}

async function main() {
  console.log("=== Synchronisation agenda Outlook — migration ===\n");
  if (!SUPABASE_URL) {
    console.error("NEXT_PUBLIC_SUPABASE_URL requis dans .env.local");
    process.exit(1);
  }

  const existing = await verifyTablesViaServiceRole();
  if (existing.ok) {
    console.log("✅ Tables outlook_connections et outlook_calendar_events déjà présentes.");
    return;
  }

  const applied = await runSqlViaPooler(MIGRATION_SQL);
  if (!applied.ok) {
    console.log("Échec:", applied.reason);
    console.log("\n→ Ajoutez SUPABASE_DB_PASSWORD dans .env.local");
    console.log("  (Supabase → Paramètres du projet → Base de données → Mot de passe)");
    console.log("  puis relancez : npm run db:outlook-calendar-sync");
    console.log("\n→ Ou collez le SQL dans l'éditeur SQL Supabase :");
    console.log("  supabase/migrations/20260630120000_outlook_calendar_sync.sql");
    process.exit(1);
  }
  console.log("✅ Migration appliquée via", applied.host);

  const verified = await verifyTablesViaServiceRole();
  if (!verified.ok) {
    console.log("⚠️ Vérification post-migration échouée:", verified.reason);
    process.exit(1);
  }
  console.log("✅ Tables vérifiées via l'API Supabase.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
