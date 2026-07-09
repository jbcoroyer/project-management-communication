"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "../../lib/server/supabaseServer";
import {
  createStarterDefinition,
  isQuestionVisible,
} from "../../lib/survey/surveyDefinitionUtils";
import { defaultPublicPathForSurvey } from "../../lib/survey/surveyPaths";
import type {
  SubmitSurveyInput,
  SurveyAnswers,
  SurveyDefinition,
  SurveyExports,
} from "../../lib/survey/surveyTypes";

export type SubmitSurveyResult = { ok: true } | { ok: false; error: string };
export type SurveyDefinitionResult =
  | { ok: true; definition: SurveyDefinition }
  | { ok: false; error: string };
export type SaveSurveyDefinitionResult = { ok: true } | { ok: false; error: string };
export type DeleteSurveyResponseResult = { ok: true } | { ok: false; error: string };

export type SurveyAudience = "externe" | "interne" | "general";

export type SurveyMeta = {
  id: string;
  title: string;
  description: string;
  version: string;
  status: "active" | "draft";
  audience: SurveyAudience;
  createdAt: string;
  publicPath: string;
};
export type SurveyListItem = SurveyMeta & {
  responseCount: number;
  questionCount: number;
  stepCount: number;
};
export type CreateSurveyResult = { ok: true; surveyId: string } | { ok: false; error: string };
export type RenameSurveyResult = { ok: true } | { ok: false; error: string };

type SupabaseServerClient = Awaited<ReturnType<typeof createServerSupabase>>;

/** Vérifie que l'utilisateur courant est administrateur (rôle admin dans profiles). */
async function requireAdmin(
  supabase: SupabaseServerClient,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Vous devez être connecté." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if ((profile?.role as string | null) !== "admin") {
    return { ok: false, error: "Action réservée à l'administrateur." };
  }
  return { ok: true };
}

function asString(value: SurveyAnswers[string]): string | null {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  return null;
}

function asStringArray(value: SurveyAnswers[string]): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean);
  return [];
}

function asNumber(value: SurveyAnswers[string]): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function parseSurveyDefinition(raw: unknown): SurveyDefinition | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as SurveyDefinition;
  if (!d.version || !Array.isArray(d.questions) || !Array.isArray(d.steps)) return null;
  return d;
}

function slugifySurveyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "questionnaire";
}

type SurveyDefinitionRow = {
  id: string;
  title: string | null;
  description: string | null;
  version: string | null;
  status: string | null;
  audience: string | null;
  created_at: string | null;
  public_path: string | null;
  definition?: unknown;
};

function parseAudience(raw: string | null): SurveyAudience {
  if (raw === "externe" || raw === "interne") return raw;
  return "general";
}

function rowToSurveyMeta(row: SurveyDefinitionRow): SurveyMeta {
  return {
    id: row.id,
    title: row.title ?? row.id,
    description: row.description ?? "",
    version: row.version ?? row.id,
    status: row.status === "draft" ? "draft" : "active",
    audience: parseAudience(row.audience),
    createdAt: row.created_at ?? "",
    publicPath: row.public_path ?? defaultPublicPathForSurvey(row.id),
  };
}

function countFromDefinition(raw: unknown): { questionCount: number; stepCount: number } {
  const def = parseSurveyDefinition(raw);
  return {
    questionCount: def?.questions.length ?? 0,
    stepCount: def?.steps.length ?? 0,
  };
}

function extractIndexedFields(exports: SurveyExports | undefined, answers: SurveyAnswers) {
  return {
    entity: exports?.entityQuestionId ? asString(answers[exports.entityQuestionId]) : null,
    service: exports?.serviceQuestionId ? asString(answers[exports.serviceQuestionId]) : null,
    prestations: exports?.prestationsQuestionId
      ? asStringArray(answers[exports.prestationsQuestionId])
      : [],
    satisfaction: exports?.satisfactionQuestionId
      ? asNumber(answers[exports.satisfactionQuestionId])
      : null,
    nps_score: exports?.npsQuestionId ? asNumber(answers[exports.npsQuestionId]) : null,
    respondent_name: exports?.respondentNameQuestionId
      ? asString(answers[exports.respondentNameQuestionId])
      : null,
  };
}

/** Métadonnées d'un questionnaire depuis la base. */
export async function getSurveyMeta(surveyId: string): Promise<SurveyMeta | null> {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("survey_definitions")
    .select("id, title, description, version, status, audience, created_at, public_path")
    .eq("id", surveyId)
    .maybeSingle();

  if (!data) return null;
  return rowToSurveyMeta(data as SurveyDefinitionRow);
}

/** Liste des questionnaires du catalogue avec leur nombre de réponses. */
export async function listSurveys(): Promise<SurveyListItem[]> {
  const supabase = await createServerSupabase();
  const { data: defs } = await supabase
    .from("survey_definitions")
    .select("id, title, description, version, status, audience, created_at, public_path, definition")
    .order("created_at", { ascending: true });

  const { data: resp } = await supabase.from("survey_responses").select("survey_version");
  const counts: Record<string, number> = {};
  for (const r of resp ?? []) {
    const v = String((r as { survey_version?: string }).survey_version ?? "");
    if (v) counts[v] = (counts[v] ?? 0) + 1;
  }

  return ((defs ?? []) as SurveyDefinitionRow[]).map((row) => {
    const meta = rowToSurveyMeta(row);
    const structure = countFromDefinition(row.definition);
    return {
      ...meta,
      responseCount: counts[meta.version] ?? 0,
      questionCount: structure.questionCount,
      stepCount: structure.stepCount,
    };
  });
}

/** Crée un nouveau questionnaire (réservé à l'administrateur). */
export async function createSurvey(title: string): Promise<CreateSurveyResult> {
  const clean = title.trim();
  if (!clean) return { ok: false, error: "Le titre du questionnaire est requis." };

  const supabase = await createServerSupabase();
  const admin = await requireAdmin(supabase);
  if (!admin.ok) return admin;

  const id = `${slugifySurveyTitle(clean)}-${Math.random().toString(36).slice(2, 6)}`;
  const definition = createStarterDefinition(id, clean);
  const publicPath = defaultPublicPathForSurvey(id);

  const { error } = await supabase.from("survey_definitions").insert({
    id,
    version: id,
    title: clean,
    description: "",
    status: "active",
    public_path: publicPath,
    definition,
  });

  if (error) {
    return { ok: false, error: error.message ?? "Création du questionnaire impossible." };
  }

  revalidatePath("/questionnaire/reponses");
  return { ok: true, surveyId: id };
}

/** Renomme un questionnaire (réservé à l'administrateur). */
export async function renameSurvey(
  surveyId: string,
  title: string,
): Promise<RenameSurveyResult> {
  const clean = title.trim();
  if (!clean) return { ok: false, error: "Le titre du questionnaire est requis." };

  const supabase = await createServerSupabase();
  const admin = await requireAdmin(supabase);
  if (!admin.ok) return admin;

  const { data } = await supabase
    .from("survey_definitions")
    .select("definition")
    .eq("id", surveyId)
    .maybeSingle();

  if (!data) return { ok: false, error: "Questionnaire introuvable." };

  const patch: Record<string, unknown> = {
    title: clean,
    updated_at: new Date().toISOString(),
  };
  const def = parseSurveyDefinition(data.definition);
  if (def) {
    patch.definition = { ...def, title: clean, intro: { ...def.intro, title: clean } };
  }

  const { error } = await supabase
    .from("survey_definitions")
    .update(patch)
    .eq("id", surveyId);

  if (error) {
    return { ok: false, error: error.message ?? "Renommage impossible." };
  }

  revalidatePath("/questionnaire/reponses");
  revalidatePath(`/questionnaire/reponses/${surveyId}`);
  revalidatePath(`/questionnaire/reponses/${surveyId}/reponses`);
  revalidatePath(`/questionnaire/reponses/${surveyId}/edit`);
  revalidatePath(`/questionnaire/f/${surveyId}`);
  return { ok: true };
}

/** Charge la définition depuis la base (source de vérité unique). */
export async function fetchSurveyDefinition(
  surveyId: string,
): Promise<SurveyDefinitionResult> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("survey_definitions")
    .select("definition")
    .eq("id", surveyId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "Questionnaire introuvable." };
  }

  const parsed = parseSurveyDefinition(data.definition);
  if (!parsed) {
    return { ok: false, error: "Définition du questionnaire invalide." };
  }

  return { ok: true, definition: parsed };
}

export async function saveSurveyDefinition(
  surveyId: string,
  definition: SurveyDefinition,
): Promise<SaveSurveyDefinitionResult> {
  const supabase = await createServerSupabase();
  const admin = await requireAdmin(supabase);
  if (!admin.ok) return admin;

  const { data: existing } = await supabase
    .from("survey_definitions")
    .select("id")
    .eq("id", surveyId)
    .maybeSingle();

  if (!existing) {
    return { ok: false, error: "Questionnaire introuvable." };
  }

  const { error } = await supabase
    .from("survey_definitions")
    .update({
      version: definition.version,
      title: definition.title,
      definition,
      updated_at: new Date().toISOString(),
    })
    .eq("id", surveyId);

  if (error) {
    return { ok: false, error: error.message ?? "Enregistrement impossible." };
  }

  revalidatePath("/questionnaire");
  revalidatePath("/questionnaire/reponses");
  revalidatePath(`/questionnaire/reponses/${surveyId}`);
  revalidatePath(`/questionnaire/reponses/${surveyId}/reponses`);
  revalidatePath(`/questionnaire/reponses/${surveyId}/edit`);
  revalidatePath(`/questionnaire/f/${surveyId}`);
  return { ok: true };
}

/**
 * Enregistre une réponse au questionnaire.
 * Accessible sans compte (rôle anon) — les réponses sont anonymes par défaut.
 */
export async function submitSurveyResponse(
  input: SubmitSurveyInput,
): Promise<SubmitSurveyResult> {
  const surveyId = input?.surveyVersion?.trim();
  if (!surveyId) {
    return { ok: false, error: "Questionnaire introuvable." };
  }

  const defResult = await fetchSurveyDefinition(surveyId);
  if (!defResult.ok) {
    return { ok: false, error: defResult.error };
  }
  const definition = defResult.definition;
  const exports = definition.exports;

  const answers = { ...(input?.answers ?? {}) };
  const respondentNameFromInput = input.respondentName?.trim() || null;
  const nameQuestionId = exports?.respondentNameQuestionId;
  if (nameQuestionId) delete answers[nameQuestionId];

  const prestationsQuestionId = exports?.prestationsQuestionId ?? "q4";
  const selectedPrestations = exports?.prestationsQuestionId
    ? asStringArray(answers[prestationsQuestionId])
    : [];

  for (const question of definition.questions) {
    if (!question.required) continue;
    if (!isQuestionVisible(question, selectedPrestations)) continue;

    const value = answers[question.id];
    const isEmpty =
      value == null ||
      (typeof value === "string" && value.trim() === "") ||
      (Array.isArray(value) && value.length === 0);
    if (isEmpty) {
      return { ok: false, error: "Merci de répondre à toutes les questions obligatoires." };
    }

    if ((question.type === "rating" || question.type === "nps") && question.scale) {
      const n = asNumber(value);
      if (n == null || n < question.scale.min || n > question.scale.max) {
        return { ok: false, error: "Une note saisie est invalide." };
      }
    }
  }

  const indexed = extractIndexedFields(exports, input?.answers ?? {});
  const respondentName = respondentNameFromInput ?? indexed.respondent_name;

  const supabase = await createServerSupabase();

  const { error } = await supabase.from("survey_responses").insert({
    survey_version: definition.version,
    entity: indexed.entity,
    service: indexed.service,
    prestations: indexed.prestations,
    satisfaction: indexed.satisfaction,
    nps_score: indexed.nps_score,
    answers,
    respondent_name: respondentName,
  });

  if (error) {
    return { ok: false, error: error.message ?? "Enregistrement de la réponse impossible." };
  }

  revalidatePath("/questionnaire/reponses");
  revalidatePath(`/questionnaire/reponses/${surveyId}/reponses`);
  return { ok: true };
}

/** Supprime une réponse (réservé à l'administrateur). */
export async function deleteSurveyResponse(
  surveyId: string,
  responseId: string,
): Promise<DeleteSurveyResponseResult> {
  if (!responseId) return { ok: false, error: "Réponse introuvable." };

  const supabase = await createServerSupabase();
  const admin = await requireAdmin(supabase);
  if (!admin.ok) return admin;

  const { error } = await supabase.from("survey_responses").delete().eq("id", responseId);
  if (error) {
    return { ok: false, error: error.message ?? "Suppression impossible." };
  }

  revalidatePath(`/questionnaire/reponses/${surveyId}/reponses`);
  return { ok: true };
}
