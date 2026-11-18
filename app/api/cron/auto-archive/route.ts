import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runAutoArchiveTasks } from "../../../../lib/server/autoArchiveTasks";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  const vercelCron = request.headers.get("x-vercel-cron");

  if (cronSecret && auth === `Bearer ${cronSecret}`) return true;
  if (vercelCron) return true;
  return process.env.NODE_ENV === "development" && !cronSecret;
}

/**
 * Cron : archive Terminé > 24 h, Terminé sans completed_at, tâches salons/events passés.
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
  try {
    const result = await runAutoArchiveTasks(admin);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "auto-archive failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
