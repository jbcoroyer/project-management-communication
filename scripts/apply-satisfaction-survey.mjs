/**
 * Applique la migration "Questionnaire de satisfaction" via le pooler Supabase.
 * Usage: node scripts/apply-satisfaction-survey.mjs
 * Requiert .env.local : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optionnel : SUPABASE_DB_PASSWORD pour exécution SQL directe (pooler).
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
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;
const PROJECT_REF = SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

const MIGRATION_SQL = readFileSync(
  resolve(root, "supabase/migrations/20260709120000_satisfaction_survey.sql"),
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

async function testAnonInsert() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !anonKey) return { ok: false, reason: "clés anon manquantes" };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/survey_responses`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      survey_version: "test-public",
      answers: { test: true },
    }),
  });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

async function cleanupTestRows() {
  if (!SUPABASE_URL || !SERVICE_KEY) return;
  await fetch(`${SUPABASE_URL}/rest/v1/survey_responses?survey_version=eq.test-public`, {
    method: "DELETE",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
}

async function main() {
  console.log("=== Questionnaire de satisfaction — application migration ===\n");

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local");
    process.exit(1);
  }

  console.log("1) Application SQL…");
  const applied = await runSqlViaPooler(MIGRATION_SQL);
  if (!applied.ok) {
    console.log("   Pooler:", applied.reason);
    console.log("\n   → Ajoutez SUPABASE_DB_PASSWORD dans .env.local puis relancez,");
    console.log("     ou exécutez manuellement dans Supabase SQL Editor :");
    console.log("     supabase/migrations/20260709120000_satisfaction_survey.sql");
    process.exit(1);
  }
  console.log("   SQL appliqué via", applied.host);

  console.log("\n2) Test dépôt anonyme…");
  const insert = await testAnonInsert();
  console.log("   INSERT:", insert.ok ? "OK" : `échec ${insert.status}`, insert.body?.slice(0, 120) ?? "");
  if (insert.ok) {
    await cleanupTestRows();
    console.log("   (ligne de test supprimée)");
  }

  if (!insert.ok) process.exit(1);
  console.log("\n✅ Questionnaire de satisfaction opérationnel.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
