import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  RdExperience,
  RdExperienceStatus,
  RdExperienceType,
  RdGate,
  RdGateDecision,
  RdGateStatus,
  RdHorizon,
  RdMaturity,
  RdPhase,
  RdProject,
  RdRisk,
  RdVerdict,
} from "./rdTypes";

type RdProjectRow = {
  id: string;
  organization_id: string;
  name: string;
  outcome: string;
  maturity: string;
  phase: string;
  risk: string;
  horizon: string;
  budget_days: number | null;
  budget_eur: number | null;
  kill_criteria: string;
  lead_user_id: string | null;
  next_gate_at: string | null;
  status: string;
  created_at: string;
};

type RdExperienceRow = {
  id: string;
  organization_id: string;
  project_id: string;
  title: string;
  hypothesis: string;
  protocol: string;
  experience_type: string;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  resources: string;
  raw_result: string;
  verdict: string | null;
  confidence: string | null;
  status: string;
  created_at: string;
};

type RdGateRow = {
  id: string;
  organization_id: string;
  project_id: string;
  name: string;
  target_phase: string;
  review_date: string | null;
  criteria: string;
  decision: string | null;
  minutes: string;
  status: string;
  created_at: string;
};

export function mapRdProject(row: RdProjectRow): RdProject {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    name: String(row.name),
    outcome: String(row.outcome ?? ""),
    maturity: row.maturity as RdMaturity,
    phase: row.phase as RdPhase,
    risk: row.risk as RdRisk,
    horizon: row.horizon as RdHorizon,
    budgetDays: row.budget_days == null ? null : Number(row.budget_days),
    budgetEur: row.budget_eur == null ? null : Number(row.budget_eur),
    killCriteria: String(row.kill_criteria ?? ""),
    leadUserId: row.lead_user_id ? String(row.lead_user_id) : null,
    nextGateAt: row.next_gate_at ?? null,
    status: row.status as RdProject["status"],
    createdAt: String(row.created_at),
  };
}

export function mapRdExperience(row: RdExperienceRow): RdExperience {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    projectId: String(row.project_id),
    title: String(row.title),
    hypothesis: String(row.hypothesis ?? ""),
    protocol: String(row.protocol ?? ""),
    experienceType: row.experience_type as RdExperienceType,
    plannedStart: row.planned_start ?? null,
    plannedEnd: row.planned_end ?? null,
    actualStart: row.actual_start ?? null,
    actualEnd: row.actual_end ?? null,
    resources: String(row.resources ?? ""),
    rawResult: String(row.raw_result ?? ""),
    verdict: (row.verdict as RdVerdict | null) ?? null,
    confidence: (row.confidence as RdExperience["confidence"]) ?? null,
    status: row.status as RdExperienceStatus,
    createdAt: String(row.created_at),
  };
}

export function mapRdGate(row: RdGateRow): RdGate {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    projectId: String(row.project_id),
    name: String(row.name),
    targetPhase: row.target_phase as RdPhase,
    reviewDate: row.review_date ?? null,
    criteria: String(row.criteria ?? ""),
    decision: (row.decision as RdGateDecision | null) ?? null,
    minutes: String(row.minutes ?? ""),
    status: row.status as RdGateStatus,
    createdAt: String(row.created_at),
  };
}

export async function fetchRdProjects(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<RdProject[]> {
  const { data, error } = await supabase
    .from("rd_projects")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as RdProjectRow[]).map(mapRdProject);
}

export async function fetchRdExperiences(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<RdExperience[]> {
  const { data, error } = await supabase
    .from("rd_experiences")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as RdExperienceRow[]).map(mapRdExperience);
}

export async function fetchRdGates(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<RdGate[]> {
  const { data, error } = await supabase
    .from("rd_gates")
    .select("*")
    .eq("organization_id", organizationId)
    .order("review_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return ((data ?? []) as RdGateRow[]).map(mapRdGate);
}

export type CreateRdProjectInput = {
  name: string;
  outcome?: string;
  maturity?: RdMaturity;
  phase?: RdPhase;
  risk?: RdRisk;
  horizon?: RdHorizon;
  budgetDays?: number | null;
  budgetEur?: number | null;
  killCriteria?: string;
  nextGateAt?: string | null;
};

export async function createRdProject(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string | null,
  input: CreateRdProjectInput,
): Promise<RdProject> {
  const { data, error } = await supabase
    .from("rd_projects")
    .insert({
      organization_id: organizationId,
      name: input.name.trim(),
      outcome: input.outcome?.trim() ?? "",
      maturity: input.maturity ?? "idee",
      phase: input.phase ?? "cadrage",
      risk: input.risk ?? "moyen",
      horizon: input.horizon ?? "moyen",
      budget_days: input.budgetDays ?? null,
      budget_eur: input.budgetEur ?? null,
      kill_criteria: input.killCriteria?.trim() ?? "",
      next_gate_at: input.nextGateAt || null,
      created_by: userId,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapRdProject(data as RdProjectRow);
}

export async function updateRdProject(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<CreateRdProjectInput> & { status?: RdProject["status"]; phase?: RdPhase },
): Promise<RdProject> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name != null) row.name = patch.name.trim();
  if (patch.outcome != null) row.outcome = patch.outcome.trim();
  if (patch.maturity != null) row.maturity = patch.maturity;
  if (patch.phase != null) row.phase = patch.phase;
  if (patch.risk != null) row.risk = patch.risk;
  if (patch.horizon != null) row.horizon = patch.horizon;
  if (patch.budgetDays !== undefined) row.budget_days = patch.budgetDays;
  if (patch.budgetEur !== undefined) row.budget_eur = patch.budgetEur;
  if (patch.killCriteria != null) row.kill_criteria = patch.killCriteria.trim();
  if (patch.nextGateAt !== undefined) row.next_gate_at = patch.nextGateAt || null;
  if (patch.status != null) row.status = patch.status;

  const { data, error } = await supabase
    .from("rd_projects")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapRdProject(data as RdProjectRow);
}

export type CreateRdExperienceInput = {
  projectId: string;
  title: string;
  hypothesis?: string;
  protocol?: string;
  experienceType?: RdExperienceType;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  resources?: string;
  status?: RdExperienceStatus;
  verdict?: RdVerdict | null;
  rawResult?: string;
  confidence?: RdExperience["confidence"];
};

export async function createRdExperience(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string | null,
  input: CreateRdExperienceInput,
): Promise<RdExperience> {
  const { data, error } = await supabase
    .from("rd_experiences")
    .insert({
      organization_id: organizationId,
      project_id: input.projectId,
      title: input.title.trim(),
      hypothesis: input.hypothesis?.trim() ?? "",
      protocol: input.protocol?.trim() ?? "",
      experience_type: input.experienceType ?? "lab",
      planned_start: input.plannedStart || null,
      planned_end: input.plannedEnd || null,
      resources: input.resources?.trim() ?? "",
      status: input.status ?? "a_concevoir",
      verdict: input.verdict ?? null,
      raw_result: input.rawResult?.trim() ?? "",
      confidence: input.confidence ?? null,
      created_by: userId,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapRdExperience(data as RdExperienceRow);
}

export async function updateRdExperience(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<CreateRdExperienceInput>,
): Promise<RdExperience> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title != null) row.title = patch.title.trim();
  if (patch.hypothesis != null) row.hypothesis = patch.hypothesis.trim();
  if (patch.protocol != null) row.protocol = patch.protocol.trim();
  if (patch.experienceType != null) row.experience_type = patch.experienceType;
  if (patch.plannedStart !== undefined) row.planned_start = patch.plannedStart || null;
  if (patch.plannedEnd !== undefined) row.planned_end = patch.plannedEnd || null;
  if (patch.resources != null) row.resources = patch.resources.trim();
  if (patch.status != null) row.status = patch.status;
  if (patch.verdict !== undefined) row.verdict = patch.verdict;
  if (patch.rawResult != null) row.raw_result = patch.rawResult.trim();
  if (patch.confidence !== undefined) row.confidence = patch.confidence;
  if (patch.projectId != null) row.project_id = patch.projectId;

  const { data, error } = await supabase
    .from("rd_experiences")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapRdExperience(data as RdExperienceRow);
}

export type CreateRdGateInput = {
  projectId: string;
  name: string;
  targetPhase?: RdPhase;
  reviewDate?: string | null;
  criteria?: string;
  status?: RdGateStatus;
  decision?: RdGateDecision | null;
  minutes?: string;
};

export async function createRdGate(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string | null,
  input: CreateRdGateInput,
): Promise<RdGate> {
  const { data, error } = await supabase
    .from("rd_gates")
    .insert({
      organization_id: organizationId,
      project_id: input.projectId,
      name: input.name.trim(),
      target_phase: input.targetPhase ?? "preuve",
      review_date: input.reviewDate || null,
      criteria: input.criteria?.trim() ?? "",
      status: input.status ?? "planifiee",
      decision: input.decision ?? null,
      minutes: input.minutes?.trim() ?? "",
      created_by: userId,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapRdGate(data as RdGateRow);
}

export async function updateRdGate(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<CreateRdGateInput>,
): Promise<RdGate> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name != null) row.name = patch.name.trim();
  if (patch.targetPhase != null) row.target_phase = patch.targetPhase;
  if (patch.reviewDate !== undefined) row.review_date = patch.reviewDate || null;
  if (patch.criteria != null) row.criteria = patch.criteria.trim();
  if (patch.status != null) row.status = patch.status;
  if (patch.decision !== undefined) row.decision = patch.decision;
  if (patch.minutes != null) row.minutes = patch.minutes.trim();
  if (patch.projectId != null) row.project_id = patch.projectId;

  const { data, error } = await supabase
    .from("rd_gates")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapRdGate(data as RdGateRow);
}

/** Applique une décision de gate : avance la phase projet si go. */
export async function decideRdGate(
  supabase: SupabaseClient,
  gate: RdGate,
  decision: RdGateDecision,
  minutes?: string,
): Promise<{ gate: RdGate; project?: RdProject }> {
  const updatedGate = await updateRdGate(supabase, gate.id, {
    decision,
    status: "decidee",
    minutes: minutes ?? gate.minutes,
  });

  if (decision === "go") {
    const project = await updateRdProject(supabase, gate.projectId, {
      phase: gate.targetPhase,
    });
    return { gate: updatedGate, project };
  }
  if (decision === "no_go") {
    const project = await updateRdProject(supabase, gate.projectId, {
      phase: "clos_tue",
      status: "clos",
    });
    return { gate: updatedGate, project };
  }
  return { gate: updatedGate };
}
