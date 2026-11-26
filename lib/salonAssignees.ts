/** CSV responsables checklist salon ↔ tableau (`tasks.admin`). */

export function parseAssignees(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatAssignees(names: readonly string[]): string | null {
  const cleaned = names.map((n) => n.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join(", ") : null;
}

/** Première personne (lane board) ou repli. */
export function primaryAssignee(
  names: readonly string[],
  fallback = "Équipe",
): string {
  const first = names.map((n) => n.trim()).find(Boolean);
  return first || fallback;
}
