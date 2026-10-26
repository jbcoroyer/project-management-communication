/**
 * Applique la migration P0/P1 V3 (buckets via API + SQL via Postgres).
 * Usage: node scripts/apply-v3-harden.mjs
 * Requiert .env.local : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Pour le SQL : SUPABASE_DB_PASSWORD (Settings → Database → Database password)
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

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

const SQL_PATH = resolve(root, "supabase/migrations/20261026140000_v3_p0_p1_harden.sql");

async function hardenBuckets(admin) {
  const deliverables = await admin.storage.updateBucket("deliverables", {
    public: false,
    fileSizeLimit: 5242880,
    allowedMimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ],
  });
  console.log("bucket deliverables:", deliverables.error?.message || "privé OK");

  const { data: buckets } = await admin.storage.listBuckets();
  const hasDam = (buckets || []).some((b) => b.id === "dam-assets");
  if (!hasDam) {
    const created = await admin.storage.createBucket("dam-assets", {
      public: false,
      fileSizeLimit: 20971520,
      allowedMimeTypes: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/svg+xml",
        "application/pdf",
        "video/mp4",
        "video/webm",
      ],
    });
    console.log("bucket dam-assets:", created.error?.message || "créé OK");
  } else {
    const up = await admin.storage.updateBucket("dam-assets", {
      public: false,
      fileSizeLimit: 20971520,
    });
    console.log("bucket dam-assets:", up.error?.message || "privé OK");
  }
}

async function runSqlViaPooler(sql) {
  if (!DB_PASSWORD || !PROJECT_REF) {
    return { ok: false, reason: "SUPABASE_DB_PASSWORD manquant" };
  }
  const { default: pg } = await import("pg");
  const hosts = [
    `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASSWORD)}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASSWORD)}@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(DB_PASSWORD)}@aws-0-eu-west-2.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres:${encodeURIComponent(DB_PASSWORD)}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
  ];
  let lastErr;
  for (const connectionString of hosts) {
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });
    try {
      await client.connect();
      await client.query(sql);
      await client.end();
      return { ok: true, host: connectionString.split("@")[1]?.split("/")[0] };
    } catch (e) {
      lastErr = e;
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
  }
  return { ok: false, reason: lastErr?.message ?? "connexion impossible" };
}

async function smoke(admin) {
  const checks = [];
  for (const table of [
    "deliverables",
    "dam_assets",
    "idea_votes",
    "event_retex",
    "allowed_email_domains",
  ]) {
    const { error } = await admin.from(table).select("*").limit(1);
    checks.push({ table, ok: !error, detail: error?.message });
  }
  const { data: buckets } = await admin.storage.listBuckets();
  const del = (buckets || []).find((b) => b.id === "deliverables");
  const dam = (buckets || []).find((b) => b.id === "dam-assets");
  checks.push({
    table: "bucket:deliverables",
    ok: Boolean(del && del.public === false),
    detail: del ? `public=${del.public}` : "absent",
  });
  checks.push({
    table: "bucket:dam-assets",
    ok: Boolean(dam && dam.public === false),
    detail: dam ? `public=${dam.public}` : "absent",
  });
  return checks;
}

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants");
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

await hardenBuckets(admin);

if (!existsSync(SQL_PATH)) {
  console.error("Migration introuvable:", SQL_PATH);
  process.exit(1);
}

const sql = readFileSync(SQL_PATH, "utf8");
const sqlResult = await runSqlViaPooler(sql);
if (sqlResult.ok) {
  console.log("SQL OK via", sqlResult.host);
} else {
  console.log("SQL via pooler ignoré:", sqlResult.reason, "(OK si déjà appliqué dans le SQL Editor)");
}

const checks = await smoke(admin);
let failed = 0;
for (const c of checks) {
  const mark = c.ok ? "OK" : "KO";
  if (!c.ok) failed += 1;
  console.log(`smoke ${mark} ${c.table}${c.detail && !c.ok ? ` — ${c.detail}` : ""}`);
}

if (failed > 0) {
  console.error(`Smoke test: ${failed} échec(s).`);
  console.error(
    "→ Collez supabase/migrations/20261026140000_v3_p0_p1_harden.sql dans le SQL Editor, ou définissez SUPABASE_DB_PASSWORD puis relancez.",
  );
  process.exit(1);
}
console.log("Smoke test: tout est vert.");
