import type { SupabaseClient } from "@supabase/supabase-js";
import { completedAtIsoForNewTaskInColumn } from "./completedAt";
import { isEndDatePast, todayIsoDate } from "./pastSalonBoard";
import { defaultCompanies, defaultDomains } from "./types";
import type { SalonChecklistItem, SalonMode } from "./salonTypes";
import { SALON_MODE_LABELS } from "./salonTypes";

const SALON_DOMAIN = defaultDomains.find((d) => d.includes("Event")) ?? defaultDomains[0];
const COLUMN_TODO = "À faire";
const COLUMN_DONE = "Terminé";

async function defaultBoardId(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("boards")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("is_default", true)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/** Crée une tâche tableau pour chaque case checklist, avec la même échéance. */
export async function syncChecklistItemsToBoard(params: {
  supabase: SupabaseClient;
  organizationId: string;
  salonId: string;
  salonName: string;
  mode: SalonMode;
  items: Array<{ id: string; label: string; dueDate: string | null; done: boolean }>;
  adminName: string;
  /** Si fourni et passé / statut terminé → no-op (évite de re-polluer le board). */
  endDate?: string | null;
  status?: string | null;
}): Promise<void> {
  if (params.status === "termine" || isEndDatePast(params.endDate)) {
    return;
  }
  const boardId = await defaultBoardId(params.supabase, params.organizationId);
  const admin = params.adminName.trim();

  for (const item of params.items) {
    const column = item.done ? COLUMN_DONE : COLUMN_TODO;
    const row: Record<string, unknown> = {
      organization_id: params.organizationId,
      project_name: item.label,
      event_category: `Salon · ${SALON_MODE_LABELS[params.mode]}`,
      salon_id: params.salonId,
      company: defaultCompanies[0],
      domain: SALON_DOMAIN,
      admin: admin || "Équipe",
      lane: admin || "Équipe",
      is_client_request: false,
      client_name: "",
      deadline: item.dueDate,
      budget: "",
      description: `Salon : ${params.salonName}`,
      column_id: column,
      priority: "Moyenne",
      projected_work: [],
      elapsed_ms: 0,
      is_running: false,
      last_start_time_ms: null,
      is_archived: false,
      estimated_hours: 0,
      estimated_days: 0,
      completed_at: completedAtIsoForNewTaskInColumn(column),
      board_id: boardId,
    };

    const { data: task, error } = await params.supabase
      .from("tasks")
      .insert(row)
      .select("id")
      .single();
    if (error || !task?.id) {
      console.error("salon→task sync", error);
      continue;
    }
    await params.supabase
      .from("salon_checklist_items")
      .update({ task_id: task.id as string })
      .eq("id", item.id);
  }
}

export async function syncChecklistPatchToTask(
  supabase: SupabaseClient,
  item: Pick<SalonChecklistItem, "taskId" | "done" | "dueDate" | "label">,
): Promise<void> {
  if (!item.taskId) return;
  const patch: Record<string, unknown> = {};
  if (item.label != null) patch.project_name = item.label;
  if (item.dueDate !== undefined) patch.deadline = item.dueDate;
  if (item.done != null) {
    patch.column_id = item.done ? COLUMN_DONE : COLUMN_TODO;
    patch.completed_at = item.done ? new Date().toISOString() : null;
  }
  if (Object.keys(patch).length === 0) return;
  await supabase.from("tasks").update(patch).eq("id", item.taskId);
}

/** Relie les cases sans `task_id` aux tableaux (salons déjà créés). */
export async function backfillMissingSalonTasks(params: {
  supabase: SupabaseClient;
  organizationId: string;
  adminName: string;
}): Promise<number> {
  const { data: items, error } = await params.supabase
    .from("salon_checklist_items")
    .select("id, label, due_date, done, salon_id, task_id")
    .eq("organization_id", params.organizationId)
    .is("task_id", null);
  if (error || !items?.length) return 0;

  const { data: salons } = await params.supabase
    .from("salons")
    .select("id, name, mode, end_date, status")
    .eq("organization_id", params.organizationId);
  const today = todayIsoDate();
  const byId = new Map(
    (salons ?? []).map((s) => [
      s.id as string,
      {
        name: s.name as string,
        mode: s.mode as SalonMode,
        endDate: (s.end_date as string | null) ?? null,
        status: (s.status as string | null) ?? null,
      },
    ]),
  );

  let n = 0;
  for (const raw of items) {
    const salon = byId.get(raw.salon_id as string);
    if (!salon) continue;
    if (salon.status === "termine" || isEndDatePast(salon.endDate, today)) continue;
    const taskId = await createTaskForChecklistItem({
      supabase: params.supabase,
      organizationId: params.organizationId,
      salonId: raw.salon_id as string,
      salonName: salon.name,
      mode: salon.mode,
      checklistItemId: raw.id as string,
      label: raw.label as string,
      dueDate: (raw.due_date as string | null) ?? null,
      adminName: params.adminName,
    });
    if (taskId) n += 1;
  }
  return n;
}

/** Crée une tâche pour une case ajoutée manuellement. */
export async function createTaskForChecklistItem(params: {
  supabase: SupabaseClient;
  organizationId: string;
  salonId: string;
  salonName: string;
  mode: SalonMode;
  checklistItemId: string;
  label: string;
  dueDate: string | null;
  adminName: string;
}): Promise<string | null> {
  const boardId = await defaultBoardId(params.supabase, params.organizationId);
  const admin = params.adminName.trim() || "Équipe";
  const { data: task, error } = await params.supabase
    .from("tasks")
    .insert({
      organization_id: params.organizationId,
      project_name: params.label,
      event_category: `Salon · ${SALON_MODE_LABELS[params.mode]}`,
      salon_id: params.salonId,
      company: defaultCompanies[0],
      domain: SALON_DOMAIN,
      admin,
      lane: admin,
      is_client_request: false,
      client_name: "",
      deadline: params.dueDate,
      budget: "",
      description: `Salon : ${params.salonName}`,
      column_id: COLUMN_TODO,
      priority: "Moyenne",
      projected_work: [],
      elapsed_ms: 0,
      is_running: false,
      last_start_time_ms: null,
      is_archived: false,
      estimated_hours: 0,
      estimated_days: 0,
      completed_at: completedAtIsoForNewTaskInColumn(COLUMN_TODO),
      board_id: boardId,
    })
    .select("id")
    .single();
  if (error || !task?.id) {
    console.error("createTaskForChecklistItem", error);
    return null;
  }
  await params.supabase
    .from("salon_checklist_items")
    .update({ task_id: task.id as string })
    .eq("id", params.checklistItemId);
  return task.id as string;
}
