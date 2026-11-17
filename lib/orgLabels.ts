/** Clés de libellés configurables par espace. */
export const ORG_LABEL_KEYS = [
  "domain",
  "company",
  "admin",
  "column",
  "task",
  "board",
  "service",
] as const;

export type OrgLabelKey = (typeof ORG_LABEL_KEYS)[number];

export type OrgLabels = Partial<Record<OrgLabelKey, string>>;

/** Libellés neutres par défaut (plus de jargon Communication imposé). */
export const DEFAULT_ORG_LABELS: Record<OrgLabelKey, string> = {
  domain: "Domaine",
  company: "Marque",
  admin: "Responsable",
  column: "Colonne",
  task: "Tâche",
  board: "Tableau",
  service: "Service",
};

export function parseOrgLabels(raw: unknown): OrgLabels {
  if (raw == null || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const next: OrgLabels = {};
  for (const key of ORG_LABEL_KEYS) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) {
      next[key] = v.trim().slice(0, 48);
    }
  }
  return next;
}

export function resolveOrgLabel(
  labels: OrgLabels | null | undefined,
  key: OrgLabelKey,
): string {
  const custom = labels?.[key]?.trim();
  return custom || DEFAULT_ORG_LABELS[key];
}
