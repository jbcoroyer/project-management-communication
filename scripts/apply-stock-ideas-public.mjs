/**
 * Applique la migration boîte à idées publique via l'API SQL Supabase (service role).
 * Usage: node scripts/apply-stock-ideas-public.mjs
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
  resolve(root, "supabase/migrations/20260529120000_stock_ideas_public_anon.sql"),
  "utf8",
);

const ENSURE_TABLE_SQL = `
create table if not exists public.stock_ideas (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  description text,
  category text not null check (category in ('materiel','process','communication','autre')),
  status text not null default 'nouveau' check (status in ('nouveau','etude','adopte','archive'))
);

grant usage on schema public to anon, authenticated;
grant select, insert on public.stock_ideas to anon;
grant select, insert, update, delete on public.stock_ideas to authenticated;
`;

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

async function testAnonAccess() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!SUPABASE_URL || !anonKey) return { ok: false, reason: "clés anon manquantes" };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/stock_ideas?select=id&limit=1`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

async function testAnonInsert() {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/stock_ideas`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      title: `[test-public] ${new Date().toISOString()}`,
      description: "Test accès public automatique — peut être supprimé.",
      category: "autre",
      status: "nouveau",
    }),
  });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

async function cleanupTestRows() {
  if (!SUPABASE_URL || !SERVICE_KEY) return;
  await fetch(
    `${SUPABASE_URL}/rest/v1/stock_ideas?title=like.[test-public]*`,
    {
      method: "DELETE",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    },
  );
}

async function main() {
  console.log("=== Boîte à idées publique — application migration ===\n");

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local");
    process.exit(1);
  }

  console.log("1) Test accès anon (avant migration)…");
  const before = await testAnonAccess();
  console.log("   SELECT:", before.ok ? "OK" : `échec ${before.status}`, before.body?.slice(0, 120) ?? "");

  const fullSql = `${ENSURE_TABLE_SQL}\n${MIGRATION_SQL}`;

  console.log("\n2) Application SQL…");
  const applied = await runSqlViaPooler(fullSql);
  if (!applied.ok) {
    console.log("   Pooler:", applied.reason);
    console.log("\n   → Ajoutez SUPABASE_DB_PASSWORD dans .env.local (mot de passe DB du projet Supabase)");
    console.log("     puis relancez: node scripts/apply-stock-ideas-public.mjs");
    console.log("\n   Ou exécutez manuellement dans Supabase SQL Editor :");
    console.log("     supabase/migrations/20260529120000_stock_ideas_public_anon.sql");
    process.exit(1);
  }
  console.log("   SQL appliqué via", applied.host);

  console.log("\n3) Test accès anon (après migration)…");
  const after = await testAnonAccess();
  console.log("   SELECT:", after.ok ? "OK" : `échec ${after.status}`, after.body?.slice(0, 120) ?? "");

  const insert = await testAnonInsert();
  console.log("   INSERT:", insert.ok ? "OK" : `échec ${insert.status}`, insert.body?.slice(0, 120) ?? "");

  if (insert.ok) {
    await cleanupTestRows();
    console.log("   (ligne de test supprimée)");
  }

  if (!after.ok || !insert.ok) {
    process.exit(1);
  }
  console.log("\n✅ Boîte à idées publique opérationnelle.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
