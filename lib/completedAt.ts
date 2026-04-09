import { DONE_COLUMN_NAME } from "./workflowConstants";

/**
 * Met à jour completed_at lors d’un changement de colonne.
 * - Entrée dans Terminé : horodatage ISO maintenant.
 * - Sortie de Terminé : null.
 * - Reste dans Terminé : undefined (ne pas envoyer completed_at dans le patch).
 */
export function completedAtPatchForColumnChange(
  previousColumn: string,
  newColumn: string,
): { completed_at: string | null } | Record<string, never> {
  if (newColumn === DONE_COLUMN_NAME && previousColumn !== DONE_COLUMN_NAME) {
    return { completed_at: new Date().toISOString() };
  }
  if (newColumn !== DONE_COLUMN_NAME && previousColumn === DONE_COLUMN_NAME) {
    return { completed_at: null };
  }
  if (newColumn !== DONE_COLUMN_NAME && previousColumn !== DONE_COLUMN_NAME) {
    return {};
  }
  return {};
}

export function completedAtIsoForNewTaskInColumn(column: string): string | null {
  return column === DONE_COLUMN_NAME ? new Date().toISOString() : null;
}
