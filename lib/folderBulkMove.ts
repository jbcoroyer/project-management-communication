import type { ColumnId, Task } from "./types";

export type FolderBulkMoveTarget =
  | { kind: "salon"; salonId: string }
  | { kind: "event"; eventId: string };

/** IDs des tâches racines actives du dossier (toutes colonnes). */
export function collectFolderTaskIds(
  tasks: Task[],
  target: FolderBulkMoveTarget,
): string[] {
  return tasks
    .filter((t) => {
      if (t.isArchived || t.parentTaskId) return false;
      if (target.kind === "salon") return t.salonId === target.salonId;
      return t.eventId === target.eventId;
    })
    .map((t) => t.id);
}

/** Sous-ensemble à déplacer (ignore déjà dans la colonne cible). */
export function folderTaskIdsNeedingMove(
  tasks: Task[],
  target: FolderBulkMoveTarget,
  column: ColumnId,
): string[] {
  return tasks
    .filter((t) => {
      if (t.isArchived || t.parentTaskId) return false;
      if (t.column === column) return false;
      if (target.kind === "salon") return t.salonId === target.salonId;
      return t.eventId === target.eventId;
    })
    .map((t) => t.id);
}
