import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/server/supabaseServer";
import {
  removeTaskFromOutlook,
  syncTaskToOutlook,
  type ProjectedWorkItem,
  type TaskForSync,
} from "../../../../lib/server/outlookSync";

type SyncBody = { taskId?: string; remove?: boolean };

/** Synchronise une tâche (et ses jours planifiés) vers l'agenda Outlook de l'utilisateur. */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let body: SyncBody;
  try {
    body = (await request.json()) as SyncBody;
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const taskId = body.taskId?.trim();
  if (!taskId) {
    return NextResponse.json({ error: "taskId requis." }, { status: 400 });
  }

  // Mode suppression : retire tous les événements Outlook liés à la tâche.
  if (body.remove) {
    try {
      const result = await removeTaskFromOutlook(user.id, taskId);
      return NextResponse.json(result);
    } catch (e) {
      console.error("Outlook remove error", e);
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Erreur de suppression." },
        { status: 500 },
      );
    }
  }

  // Lecture via la session utilisateur (RLS) : l'utilisateur doit pouvoir voir la tâche.
  const { data: row, error } = await supabase
    .from("tasks")
    .select("id, project_name, description, company, domain, projected_work")
    .eq("id", taskId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Tâche introuvable." }, { status: 404 });
  }

  const task: TaskForSync = {
    id: row.id as string,
    projectName: (row.project_name as string) ?? "Tâche",
    description: (row.description as string | null) ?? null,
    company: (row.company as string | null) ?? null,
    domain: (row.domain as string | null) ?? null,
    projectedWork: ((row.projected_work as ProjectedWorkItem[] | null) ?? []).filter(
      (item) => item && typeof item.date === "string" && item.date.length > 0,
    ),
  };

  try {
    const result = await syncTaskToOutlook(user.id, task);
    return NextResponse.json(result);
  } catch (e) {
    console.error("Outlook sync error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur de synchronisation." },
      { status: 500 },
    );
  }
}
