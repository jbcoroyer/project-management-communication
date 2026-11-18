import type { Task } from "./types";
import { AUTO_ARCHIVE_DELAY_MS, DONE_COLUMN_NAME } from "./workflowConstants";

/**
 * Une tâche « Terminé » est éligible à l’archivage auto si :
 * - non archivée, racine (pas sous-tâche) ;
 * - `completedAt` plus vieux que le délai (24 h) ;
 * - ou `completedAt` manquant (bug legacy) → éligible immédiatement pour
 *   débloquer les Terminé coincés depuis des semaines.
 */
export function isDoneTaskReadyToArchive(
  task: Pick<Task, "column" | "isArchived" | "parentTaskId" | "completedAt">,
  nowMs: number = Date.now(),
  delayMs: number = AUTO_ARCHIVE_DELAY_MS,
): boolean {
  if (task.column !== DONE_COLUMN_NAME || task.isArchived || task.parentTaskId) {
    return false;
  }
  if (!task.completedAt) return true;
  const doneMs = new Date(task.completedAt).getTime();
  if (!Number.isFinite(doneMs) || doneMs <= 0) return true;
  return nowMs - doneMs > delayMs;
}

export function selectTasksReadyToAutoArchive(
  tasks: Task[],
  nowMs: number = Date.now(),
  delayMs: number = AUTO_ARCHIVE_DELAY_MS,
): Task[] {
  return tasks.filter((t) => isDoneTaskReadyToArchive(t, nowMs, delayMs));
}

/** Seuil ISO pour `completed_at < cutoff` côté SQL (tâches horodatées seulement). */
export function autoArchiveCompletedBeforeIso(
  nowMs: number = Date.now(),
  delayMs: number = AUTO_ARCHIVE_DELAY_MS,
): string {
  return new Date(nowMs - delayMs).toISOString();
}
