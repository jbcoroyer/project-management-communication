/** Actions métier proposées par surface (inventaire + contrats de menu). */

export type TaskContextActionId =
  | "open"
  | "edit"
  | "copy-title"
  | "move"
  | "archive"
  | "delete";

export type FolderContextActionId =
  | "open-salon"
  | "toggle-collapse"
  | "copy-name"
  | "move-all";

export type SalonCardContextActionId =
  | "open"
  | "rename"
  | "copy-name"
  | "clone"
  | "mark-done"
  | "delete";

export type ArchiveContextActionId = "restore" | "copy-title" | "delete";

export const TASK_CONTEXT_ACTIONS: readonly TaskContextActionId[] = [
  "open",
  "edit",
  "copy-title",
  "move",
  "archive",
  "delete",
] as const;

export const FOLDER_CONTEXT_ACTIONS: readonly FolderContextActionId[] = [
  "open-salon",
  "toggle-collapse",
  "copy-name",
  "move-all",
] as const;

export const SALON_CARD_CONTEXT_ACTIONS: readonly SalonCardContextActionId[] = [
  "open",
  "rename",
  "copy-name",
  "clone",
  "mark-done",
  "delete",
] as const;

export const ARCHIVE_CONTEXT_ACTIONS: readonly ArchiveContextActionId[] = [
  "restore",
  "copy-title",
  "delete",
] as const;

/** Colonnes cibles pour « Déplacer vers », en excluant la colonne courante. */
export function moveTargetColumns(
  columns: readonly string[],
  currentColumn: string,
): string[] {
  return columns.filter((col) => col !== currentColumn);
}

/** Positionne le menu dans la fenêtre (évite le débordement). */
export function clampMenuPosition(
  x: number,
  y: number,
  viewport: { width: number; height: number },
  menu: { width: number; height: number } = { width: 184, height: 220 },
  padding = 8,
): { x: number; y: number } {
  const maxX = Math.max(padding, viewport.width - menu.width - padding);
  const maxY = Math.max(padding, viewport.height - menu.height - padding);
  return {
    x: Math.min(Math.max(padding, x), maxX),
    y: Math.min(Math.max(padding, y), maxY),
  };
}

/** Libellés FR stables pour les actions tâche (smoke / inventaire). */
export function taskContextActionLabel(id: TaskContextActionId): string {
  switch (id) {
    case "open":
      return "Ouvrir";
    case "edit":
      return "Modifier";
    case "copy-title":
      return "Copier le titre";
    case "move":
      return "Déplacer vers";
    case "archive":
      return "Archiver";
    case "delete":
      return "Supprimer";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}
