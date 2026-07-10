import type { ReferenceRecord } from "./referenceData";

/** Liste des collaborateurs pour les filtres : équipe active + assignés trouvés dans les tâches. */
export function buildAdminFilterList(
  adminRecords: readonly ReferenceRecord[],
  tasks: readonly { admins: string[] }[],
): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const record of adminRecords) {
    const name = record.name.trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      ordered.push(name);
    }
  }

  const extras: string[] = [];
  for (const task of tasks) {
    for (const admin of task.admins) {
      const trimmed = admin?.trim();
      if (trimmed && !seen.has(trimmed)) extras.push(trimmed);
    }
  }

  extras.sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
  for (const name of extras) {
    if (!seen.has(name)) {
      seen.add(name);
      ordered.push(name);
    }
  }

  return ordered;
}
