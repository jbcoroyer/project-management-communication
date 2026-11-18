/**
 * Helpers : salons / events passés ne doivent plus polluer le board actif.
 */

export function todayIsoDate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Date de fin (YYYY-MM-DD) strictement avant aujourd’hui → salon passé. */
export function isEndDatePast(
  endDate: string | null | undefined,
  today: string = todayIsoDate(),
): boolean {
  if (!endDate || typeof endDate !== "string") return false;
  const trimmed = endDate.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  return trimmed < today;
}

export type PastLinkedTask = {
  isArchived?: boolean;
  parentTaskId?: string;
  salonId?: string;
  salonEndDate?: string | null;
  salonStatus?: string | null;
  eventId?: string;
  eventEndDate?: string | null;
};

/**
 * Tâche liée à un salon (ou event) dont la date de fin est passée,
 * ou statut salon `termine`. Racines non archivées seulement.
 */
export function isPastLinkedBoardTask(
  task: PastLinkedTask,
  today: string = todayIsoDate(),
): boolean {
  if (task.isArchived || task.parentTaskId) return false;
  if (task.salonId) {
    if (task.salonStatus === "termine") return true;
    if (isEndDatePast(task.salonEndDate, today)) return true;
  }
  if (task.eventId && isEndDatePast(task.eventEndDate, today)) return true;
  return false;
}

/** Filtre UI : retire du board actif les tâches de salons/events passés. */
export function filterOutPastSalonTasks<T extends PastLinkedTask>(
  tasks: T[],
  today: string = todayIsoDate(),
): T[] {
  return tasks.filter((t) => !isPastLinkedBoardTask(t, today));
}

export function selectPastSalonTasksToArchive(
  tasks: PastLinkedTask[],
  today: string = todayIsoDate(),
): PastLinkedTask[] {
  return tasks.filter((t) => isPastLinkedBoardTask(t, today));
}
