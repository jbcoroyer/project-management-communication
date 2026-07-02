"use client";

import { getSupabaseBrowser } from "../supabaseBrowser";
import { markTaskMutatedLocally } from "../taskMutatedLocally";
import type { Priority } from "../types";

export type QuickTaskInput = {
  projectName: string;
  company: string;
  domain: string;
  adminName: string;
  description?: string;
  deadline?: string | null;
  priority?: Priority;
  estimatedHours?: number;
  eventId?: string | null;
};

/**
 * Crée une tâche Kanban en base (colonne « À faire »), en miroir de la logique V1.
 * Utilisé par le réassort stock (4.1) et la conversion d'idées (4.3).
 */
export async function createQuickTask(input: QuickTaskInput): Promise<{ id: string | null }> {
  const supabase = getSupabaseBrowser();
  const workDate = input.deadline ?? new Date().toISOString().slice(0, 10);
  const estimatedHours = input.estimatedHours ?? 1;

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      project_name: input.projectName,
      company: input.company,
      domain: input.domain,
      admin: input.adminName,
      is_client_request: false,
      client_name: "",
      deadline: workDate,
      budget: "",
      description: input.description ?? "",
      column_id: "À faire",
      priority: input.priority ?? "Moyenne",
      projected_work: [{ date: workDate, hours: estimatedHours }],
      elapsed_ms: 0,
      is_running: false,
      last_start_time_ms: null,
      is_archived: false,
      estimated_hours: estimatedHours,
      estimated_days: 0,
      event_id: input.eventId ?? null,
    })
    .select("id")
    .maybeSingle();

  if (error) throw error;
  const id = (data as { id?: string } | null)?.id ?? null;
  markTaskMutatedLocally(id ?? undefined);
  return { id };
}
