export const RD_MATURITY_OPTIONS = [
  { value: "idee", label: "Idée" },
  { value: "lab", label: "Lab" },
  { value: "pilote", label: "Pilote" },
  { value: "transfert", label: "Transfert" },
  { value: "industrialisable", label: "Industrialisable" },
] as const;

export const RD_PHASE_OPTIONS = [
  { value: "cadrage", label: "Cadrage" },
  { value: "exploration", label: "Exploration" },
  { value: "preuve", label: "Preuve" },
  { value: "pilote", label: "Pilote" },
  { value: "transfert", label: "Transfert" },
  { value: "clos_succes", label: "Clos — succès" },
  { value: "clos_tue", label: "Clos — tué" },
  { value: "clos_park", label: "Clos — park" },
] as const;

export const RD_RISK_OPTIONS = [
  { value: "faible", label: "Faible" },
  { value: "moyen", label: "Moyen" },
  { value: "eleve", label: "Élevé" },
] as const;

export const RD_HORIZON_OPTIONS = [
  { value: "court", label: "Court" },
  { value: "moyen", label: "Moyen" },
  { value: "long", label: "Long" },
] as const;

export const RD_EXPERIENCE_TYPE_OPTIONS = [
  { value: "lab", label: "Lab" },
  { value: "terrain", label: "Terrain" },
  { value: "simulation", label: "Simulation" },
  { value: "bench", label: "Bench" },
  { value: "autre", label: "Autre" },
] as const;

export const RD_VERDICT_OPTIONS = [
  { value: "confirme", label: "Confirme" },
  { value: "infirme", label: "Infirme" },
  { value: "inconclusif", label: "Inconclusif" },
  { value: "a_refaire", label: "À refaire" },
] as const;

export const RD_EXPERIENCE_STATUS_OPTIONS = [
  { value: "a_concevoir", label: "À concevoir" },
  { value: "planifiee", label: "Planifiée" },
  { value: "en_cours", label: "En cours" },
  { value: "analyse", label: "Analyse" },
  { value: "cloturee", label: "Clôturée" },
] as const;

export const RD_GATE_DECISION_OPTIONS = [
  { value: "go", label: "Go" },
  { value: "no_go", label: "No-go" },
  { value: "pivot", label: "Pivot" },
  { value: "differe", label: "Différé" },
] as const;

export const RD_GATE_STATUS_OPTIONS = [
  { value: "planifiee", label: "Planifiée" },
  { value: "en_preparation", label: "En préparation" },
  { value: "revue_tenue", label: "Revue tenue" },
  { value: "decidee", label: "Décidée" },
  { value: "suivi_actions", label: "Suivi actions" },
] as const;

export type RdMaturity = (typeof RD_MATURITY_OPTIONS)[number]["value"];
export type RdPhase = (typeof RD_PHASE_OPTIONS)[number]["value"];
export type RdRisk = (typeof RD_RISK_OPTIONS)[number]["value"];
export type RdHorizon = (typeof RD_HORIZON_OPTIONS)[number]["value"];
export type RdExperienceType = (typeof RD_EXPERIENCE_TYPE_OPTIONS)[number]["value"];
export type RdVerdict = (typeof RD_VERDICT_OPTIONS)[number]["value"];
export type RdExperienceStatus = (typeof RD_EXPERIENCE_STATUS_OPTIONS)[number]["value"];
export type RdGateDecision = (typeof RD_GATE_DECISION_OPTIONS)[number]["value"];
export type RdGateStatus = (typeof RD_GATE_STATUS_OPTIONS)[number]["value"];

export type RdProject = {
  id: string;
  organizationId: string;
  name: string;
  outcome: string;
  maturity: RdMaturity;
  phase: RdPhase;
  risk: RdRisk;
  horizon: RdHorizon;
  budgetDays: number | null;
  budgetEur: number | null;
  killCriteria: string;
  leadUserId: string | null;
  nextGateAt: string | null;
  status: "actif" | "en_pause" | "clos";
  createdAt: string;
};

export type RdExperience = {
  id: string;
  organizationId: string;
  projectId: string;
  title: string;
  hypothesis: string;
  protocol: string;
  experienceType: RdExperienceType;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  resources: string;
  rawResult: string;
  verdict: RdVerdict | null;
  confidence: "faible" | "moyenne" | "haute" | null;
  status: RdExperienceStatus;
  createdAt: string;
};

export type RdGate = {
  id: string;
  organizationId: string;
  projectId: string;
  name: string;
  targetPhase: RdPhase;
  reviewDate: string | null;
  criteria: string;
  decision: RdGateDecision | null;
  minutes: string;
  status: RdGateStatus;
  createdAt: string;
};

export function labelForOption<T extends string>(
  options: readonly { value: T; label: string }[],
  value: T | null | undefined,
): string {
  if (value == null) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}
