import type { SupabaseClient } from "@supabase/supabase-js";
import { autoArchiveCompletedBeforeIso } from "../autoArchive";
import { todayIsoDate } from "../pastSalonBoard";
import { DONE_COLUMN_NAME } from "../workflowConstants";

export type AutoArchiveResult = {
  archivedByCompletedAt: number;
  archivedMissingCompletedAt: number;
  archivedPastSalons: number;
  archivedPastEvents: number;
};

/**
 * Archivage serveur (cron) : Terminé J+1 + Terminé sans completed_at +
 * tâches liées à des salons/events dont la date de fin est passée.
 */
export async function runAutoArchiveTasks(
  admin: SupabaseClient,
  nowMs: number = Date.now(),
): Promise<AutoArchiveResult> {
  const cutoff = autoArchiveCompletedBeforeIso(nowMs);
  const today = todayIsoDate(new Date(nowMs));

  const { data: aged, error: agedErr } = await admin
    .from("tasks")
    .update({ is_archived: true })
    .eq("is_archived", false)
    .eq("column_id", DONE_COLUMN_NAME)
    .is("parent_task_id", null)
    .lt("completed_at", cutoff)
    .not("completed_at", "is", null)
    .select("id");
  if (agedErr) throw agedErr;

  const { data: missing, error: missingErr } = await admin
    .from("tasks")
    .update({ is_archived: true })
    .eq("is_archived", false)
    .eq("column_id", DONE_COLUMN_NAME)
    .is("parent_task_id", null)
    .is("completed_at", null)
    .select("id");
  if (missingErr) throw missingErr;

  let archivedPastSalons = 0;
  const { data: pastSalons, error: salonsErr } = await admin
    .from("salons")
    .select("id")
    .or(`end_date.lt.${today},status.eq.termine`);
  if (salonsErr) throw salonsErr;
  const pastSalonIds = (pastSalons ?? []).map((s) => s.id as string).filter(Boolean);
  if (pastSalonIds.length > 0) {
    // Chunk to avoid URL length limits
    for (let i = 0; i < pastSalonIds.length; i += 80) {
      const chunk = pastSalonIds.slice(i, i + 80);
      const { data, error } = await admin
        .from("tasks")
        .update({ is_archived: true })
        .eq("is_archived", false)
        .is("parent_task_id", null)
        .in("salon_id", chunk)
        .select("id");
      if (error) throw error;
      archivedPastSalons += data?.length ?? 0;
    }
  }

  let archivedPastEvents = 0;
  const { data: pastEvents, error: eventsErr } = await admin
    .from("events")
    .select("id")
    .lt("end_date", today);
  if (eventsErr) throw eventsErr;
  const pastEventIds = (pastEvents ?? []).map((e) => e.id as string).filter(Boolean);
  if (pastEventIds.length > 0) {
    for (let i = 0; i < pastEventIds.length; i += 80) {
      const chunk = pastEventIds.slice(i, i + 80);
      const { data, error } = await admin
        .from("tasks")
        .update({ is_archived: true })
        .eq("is_archived", false)
        .is("parent_task_id", null)
        .in("event_id", chunk)
        .select("id");
      if (error) throw error;
      archivedPastEvents += data?.length ?? 0;
    }
  }

  return {
    archivedByCompletedAt: aged?.length ?? 0,
    archivedMissingCompletedAt: missing?.length ?? 0,
    archivedPastSalons,
    archivedPastEvents,
  };
}
