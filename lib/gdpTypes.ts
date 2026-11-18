export const GDP_STATUS_OPTIONS = [
  { value: "brouillon", label: "Brouillon" },
  { value: "qualification", label: "Qualification" },
  { value: "actif", label: "Actif" },
  { value: "en_pause", label: "En pause" },
  { value: "cloture", label: "Clôturé" },
  { value: "archive", label: "Archivé" },
  { value: "annule", label: "Annulé" },
] as const;

export const GDP_HEALTH_OPTIONS = [
  { value: "vert", label: "Vert" },
  { value: "orange", label: "Orange" },
  { value: "rouge", label: "Rouge" },
] as const;

export const GDP_TYPOLOGY_OPTIONS = [
  { value: "capex", label: "CAPEX" },
  { value: "process", label: "Process" },
  { value: "si", label: "SI" },
  { value: "organisation", label: "Organisation" },
  { value: "qualite", label: "Qualité" },
  { value: "autre", label: "Autre" },
] as const;

export const GDP_PRIORITY_OPTIONS = [
  { value: "basse", label: "Basse" },
  { value: "moyenne", label: "Moyenne" },
  { value: "haute", label: "Haute" },
  { value: "critique", label: "Critique" },
] as const;

export const GDP_MILESTONE_STATUS_OPTIONS = [
  { value: "a_venir", label: "À venir" },
  { value: "atteint", label: "Atteint" },
  { value: "manque", label: "Manqué" },
  { value: "decale", label: "Décalé" },
] as const;

export const GDP_RISK_STATUS_OPTIONS = [
  { value: "ouvert", label: "Ouvert" },
  { value: "en_mitigation", label: "En mitigation" },
  { value: "accepte", label: "Accepté" },
  { value: "clos", label: "Clos" },
] as const;

export type GdpStatus = (typeof GDP_STATUS_OPTIONS)[number]["value"];
export type GdpHealth = (typeof GDP_HEALTH_OPTIONS)[number]["value"];
export type GdpTypology = (typeof GDP_TYPOLOGY_OPTIONS)[number]["value"];
export type GdpPriority = (typeof GDP_PRIORITY_OPTIONS)[number]["value"];
export type GdpMilestoneStatus = (typeof GDP_MILESTONE_STATUS_OPTIONS)[number]["value"];
export type GdpRiskStatus = (typeof GDP_RISK_STATUS_OPTIONS)[number]["value"];

export type GdpProject = {
  id: string;
  organizationId: string;
  name: string;
  code: string | null;
  status: GdpStatus;
  health: GdpHealth;
  sponsorUserId: string | null;
  chefUserId: string | null;
  company: string;
  typology: GdpTypology;
  startDate: string | null;
  targetEndDate: string | null;
  budgetPlanned: number | null;
  budgetSpent: number | null;
  objective: string;
  successIndicators: string;
  portfolioPriority: GdpPriority;
  progressPct: number;
  contributorServiceSlugs: string[];
  createdAt: string;
};

export type GdpMilestone = {
  id: string;
  organizationId: string;
  projectId: string;
  name: string;
  dueDate: string | null;
  status: GdpMilestoneStatus;
  isCritical: boolean;
  createdAt: string;
};

export type GdpRisk = {
  id: string;
  organizationId: string;
  projectId: string;
  title: string;
  probability: number;
  impact: number;
  ownerUserId: string | null;
  mitigationPlan: string;
  status: GdpRiskStatus;
  createdAt: string;
};

export type GdpDecision = {
  id: string;
  organizationId: string;
  projectId: string;
  title: string;
  decidedAt: string;
  decideurUserId: string | null;
  context: string;
  decision: string;
  followUp: string;
  createdAt: string;
};

export function gdpRiskScore(probability: number, impact: number): number {
  return probability * impact;
}

export function labelForOption<T extends string>(
  options: readonly { value: T; label: string }[],
  value: T | null | undefined,
): string {
  if (value == null) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}
