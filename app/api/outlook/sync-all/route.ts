import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/server/supabaseServer";
import { syncAllTasksForUser } from "../../../../lib/server/outlookSync";
import { getServerUserIdentity } from "../../../../lib/server/userIdentity";

/** Synchronise toutes les tâches planifiées de l'utilisateur vers Outlook. */
export async function POST() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  try {
    const identity = await getServerUserIdentity(user.id);
    const { data: rows, error } = await supabase
      .from("tasks")
      .select("id, project_name, description, company, domain, projected_work, admin, lane, is_archived")
      .eq("is_archived", false);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const result = await syncAllTasksForUser(user.id, identity, (rows ?? []) as Record<string, unknown>[]);
    return NextResponse.json(result);
  } catch (e) {
    console.error("Outlook sync-all error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur de synchronisation." },
      { status: 500 },
    );
  }
}
