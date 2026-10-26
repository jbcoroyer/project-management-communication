import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runAutomationsServer } from "../../../../lib/server/runAutomations";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  const vercelCron = request.headers.get("x-vercel-cron");

  // Vercel Cron envoie Authorization: Bearer <CRON_SECRET> quand la var est définie.
  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;

  // Secours : en-tête interne Vercel Cron (réseau plateforme).
  if (vercelCron) return true;

  // Local sans secret configuré uniquement.
  return process.env.NODE_ENV === "development" && !cronSecret;
}

/**
 * Cron Vercel : exécute les automatisations hors navigateur.
 * Définir CRON_SECRET sur Vercel (Authorization: Bearer …).
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "Supabase non configuré" }, { status: 500 });
  }

  const admin = createClient(url, key, { auth: { persistSession: false } });
  const result = await runAutomationsServer(admin);
  return NextResponse.json({ ok: true, ...result });
}
