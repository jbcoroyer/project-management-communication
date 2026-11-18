import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  GdpDecision,
  GdpHealth,
  GdpMilestone,
  GdpMilestoneStatus,
  GdpPriority,
  GdpProject,
  GdpRisk,
  GdpRiskStatus,
  GdpStatus,
  GdpTypology,
} from "./gdpTypes";

type GdpProjectRow = {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  status: string;
  health: string;
  sponsor_user_id: string | null;
  chef_user_id: string | null;
  company: string;
  typology: string;
  start_date: string | null;
  target_end_date: string | null;
  budget_planned: number | null;
  budget_spent: number | null;
  objective: string;
  success_indicators: string;
  portfolio_priority: string;
  progress_pct: number;
  contributor_service_slugs: string[] | null;
  created_at: string;
};

type GdpMilestoneRow = {
  id: string;
  organization_id: string;
  project_id: string;
  name: string;
  due_date: string | null;
  status: string;
  is_critical: boolean;
  created_at: string;
};

type GdpRiskRow = {
  id: string;
  organization_id: string;
  project_id: string;
  title: string;
  probability: number;
  impact: number;
  owner_user_id: string | null;
  mitigation_plan: string;
  status: string;
  created_at: string;
};

type GdpDecisionRow = {
  id: string;
  organization_id: string;
  project_id: string;
  title: string;
  decided_at: string;
  decideur_user_id: string | null;
  context: string;
  decision: string;
  follow_up: string;
  created_at: string;
};

export function mapGdpProject(row: GdpProjectRow): GdpProject {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    name: String(row.name),
    code: row.code ? String(row.code) : null,
    status: row.status as GdpStatus,
    health: row.health as GdpHealth,
    sponsorUserId: row.sponsor_user_id ? String(row.sponsor_user_id) : null,
    chefUserId: row.chef_user_id ? String(row.chef_user_id) : null,
    company: String(row.company ?? ""),
    typology: row.typology as GdpTypology,
    startDate: row.start_date ?? null,
    targetEndDate: row.target_end_date ?? null,
    budgetPlanned: row.budget_planned == null ? null : Number(row.budget_planned),
    budgetSpent: row.budget_spent == null ? null : Number(row.budget_spent),
    objective: String(row.objective ?? ""),
    successIndicators: String(row.success_indicators ?? ""),
    portfolioPriority: row.portfolio_priority as GdpPriority,
    progressPct: Number(row.progress_pct) || 0,
    contributorServiceSlugs: Array.isArray(row.contributor_service_slugs)
      ? row.contributor_service_slugs.map(String)
      : [],
    createdAt: String(row.created_at),
  };
}

export function mapGdpMilestone(row: GdpMilestoneRow): GdpMilestone {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    projectId: String(row.project_id),
    name: String(row.name),
    dueDate: row.due_date ?? null,
    status: row.status as GdpMilestoneStatus,
    isCritical: Boolean(row.is_critical),
    createdAt: String(row.created_at),
  };
}

export function mapGdpRisk(row: GdpRiskRow): GdpRisk {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    projectId: String(row.project_id),
    title: String(row.title),
    probability: Number(row.probability) || 1,
    impact: Number(row.impact) || 1,
    ownerUserId: row.owner_user_id ? String(row.owner_user_id) : null,
    mitigationPlan: String(row.mitigation_plan ?? ""),
    status: row.status as GdpRiskStatus,
    createdAt: String(row.created_at),
  };
}

export function mapGdpDecision(row: GdpDecisionRow): GdpDecision {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    projectId: String(row.project_id),
    title: String(row.title),
    decidedAt: String(row.decided_at),
    decideurUserId: row.decideur_user_id ? String(row.decideur_user_id) : null,
    context: String(row.context ?? ""),
    decision: String(row.decision ?? ""),
    followUp: String(row.follow_up ?? ""),
    createdAt: String(row.created_at),
  };
}

export async function fetchGdpProjects(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<GdpProject[]> {
  const { data, error } = await supabase
    .from("gdp_projects")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as GdpProjectRow[]).map(mapGdpProject);
}

export async function fetchGdpMilestones(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<GdpMilestone[]> {
  const { data, error } = await supabase
    .from("gdp_milestones")
    .select("*")
    .eq("organization_id", organizationId)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return ((data ?? []) as GdpMilestoneRow[]).map(mapGdpMilestone);
}

export async function fetchGdpRisks(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<GdpRisk[]> {
  const { data, error } = await supabase
    .from("gdp_risks")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as GdpRiskRow[]).map(mapGdpRisk);
}

export async function fetchGdpDecisions(
  supabase: SupabaseClient,
  organizationId: string,
): Promise<GdpDecision[]> {
  const { data, error } = await supabase
    .from("gdp_decisions")
    .select("*")
    .eq("organization_id", organizationId)
    .order("decided_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as GdpDecisionRow[]).map(mapGdpDecision);
}

export type CreateGdpProjectInput = {
  name: string;
  code?: string | null;
  status?: GdpStatus;
  health?: GdpHealth;
  company?: string;
  typology?: GdpTypology;
  startDate?: string | null;
  targetEndDate?: string | null;
  objective?: string;
  successIndicators?: string;
  portfolioPriority?: GdpPriority;
  progressPct?: number;
  budgetPlanned?: number | null;
  budgetSpent?: number | null;
};

export async function createGdpProject(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string | null,
  input: CreateGdpProjectInput,
): Promise<GdpProject> {
  const { data, error } = await supabase
    .from("gdp_projects")
    .insert({
      organization_id: organizationId,
      name: input.name.trim(),
      code: input.code?.trim() || null,
      status: input.status ?? "brouillon",
      health: input.health ?? "vert",
      company: input.company?.trim() ?? "",
      typology: input.typology ?? "autre",
      start_date: input.startDate || null,
      target_end_date: input.targetEndDate || null,
      objective: input.objective?.trim() ?? "",
      success_indicators: input.successIndicators?.trim() ?? "",
      portfolio_priority: input.portfolioPriority ?? "moyenne",
      progress_pct: input.progressPct ?? 0,
      budget_planned: input.budgetPlanned ?? null,
      budget_spent: input.budgetSpent ?? null,
      created_by: userId,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapGdpProject(data as GdpProjectRow);
}

export async function updateGdpProject(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<CreateGdpProjectInput>,
): Promise<GdpProject> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name != null) row.name = patch.name.trim();
  if (patch.code !== undefined) row.code = patch.code?.trim() || null;
  if (patch.status != null) row.status = patch.status;
  if (patch.health != null) row.health = patch.health;
  if (patch.company != null) row.company = patch.company.trim();
  if (patch.typology != null) row.typology = patch.typology;
  if (patch.startDate !== undefined) row.start_date = patch.startDate || null;
  if (patch.targetEndDate !== undefined) row.target_end_date = patch.targetEndDate || null;
  if (patch.objective != null) row.objective = patch.objective.trim();
  if (patch.successIndicators != null) row.success_indicators = patch.successIndicators.trim();
  if (patch.portfolioPriority != null) row.portfolio_priority = patch.portfolioPriority;
  if (patch.progressPct != null) row.progress_pct = patch.progressPct;
  if (patch.budgetPlanned !== undefined) row.budget_planned = patch.budgetPlanned;
  if (patch.budgetSpent !== undefined) row.budget_spent = patch.budgetSpent;

  const { data, error } = await supabase
    .from("gdp_projects")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapGdpProject(data as GdpProjectRow);
}

export type CreateGdpMilestoneInput = {
  projectId: string;
  name: string;
  dueDate?: string | null;
  status?: GdpMilestoneStatus;
  isCritical?: boolean;
};

export async function createGdpMilestone(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string | null,
  input: CreateGdpMilestoneInput,
): Promise<GdpMilestone> {
  const { data, error } = await supabase
    .from("gdp_milestones")
    .insert({
      organization_id: organizationId,
      project_id: input.projectId,
      name: input.name.trim(),
      due_date: input.dueDate || null,
      status: input.status ?? "a_venir",
      is_critical: input.isCritical ?? false,
      created_by: userId,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapGdpMilestone(data as GdpMilestoneRow);
}

export async function updateGdpMilestone(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<CreateGdpMilestoneInput>,
): Promise<GdpMilestone> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name != null) row.name = patch.name.trim();
  if (patch.dueDate !== undefined) row.due_date = patch.dueDate || null;
  if (patch.status != null) row.status = patch.status;
  if (patch.isCritical != null) row.is_critical = patch.isCritical;
  if (patch.projectId != null) row.project_id = patch.projectId;

  const { data, error } = await supabase
    .from("gdp_milestones")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapGdpMilestone(data as GdpMilestoneRow);
}

export type CreateGdpRiskInput = {
  projectId: string;
  title: string;
  probability?: number;
  impact?: number;
  mitigationPlan?: string;
  status?: GdpRiskStatus;
};

export async function createGdpRisk(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string | null,
  input: CreateGdpRiskInput,
): Promise<GdpRisk> {
  const { data, error } = await supabase
    .from("gdp_risks")
    .insert({
      organization_id: organizationId,
      project_id: input.projectId,
      title: input.title.trim(),
      probability: input.probability ?? 2,
      impact: input.impact ?? 2,
      mitigation_plan: input.mitigationPlan?.trim() ?? "",
      status: input.status ?? "ouvert",
      created_by: userId,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapGdpRisk(data as GdpRiskRow);
}

export async function updateGdpRisk(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<CreateGdpRiskInput>,
): Promise<GdpRisk> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title != null) row.title = patch.title.trim();
  if (patch.probability != null) row.probability = patch.probability;
  if (patch.impact != null) row.impact = patch.impact;
  if (patch.mitigationPlan != null) row.mitigation_plan = patch.mitigationPlan.trim();
  if (patch.status != null) row.status = patch.status;
  if (patch.projectId != null) row.project_id = patch.projectId;

  const { data, error } = await supabase
    .from("gdp_risks")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapGdpRisk(data as GdpRiskRow);
}

export type CreateGdpDecisionInput = {
  projectId: string;
  title: string;
  decidedAt?: string;
  context?: string;
  decision?: string;
  followUp?: string;
};

export async function createGdpDecision(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string | null,
  input: CreateGdpDecisionInput,
): Promise<GdpDecision> {
  const { data, error } = await supabase
    .from("gdp_decisions")
    .insert({
      organization_id: organizationId,
      project_id: input.projectId,
      title: input.title.trim(),
      decided_at: input.decidedAt || new Date().toISOString().slice(0, 10),
      context: input.context?.trim() ?? "",
      decision: input.decision?.trim() ?? "",
      follow_up: input.followUp?.trim() ?? "",
      decideur_user_id: userId,
      created_by: userId,
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapGdpDecision(data as GdpDecisionRow);
}
