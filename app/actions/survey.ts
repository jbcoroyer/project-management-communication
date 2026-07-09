"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "../../lib/server/supabaseServer";
import { isQuestionVisible } from "../../lib/survey/surveyDefinitionUtils";
import {
  getDefaultSurveyDefinition,
  getSurveyRegistryEntry,
} from "../../lib/survey/surveyRegistry";
import type {
  SubmitSurveyInput,
  SurveyAnswers,
  SurveyDefinition,
} from "../../lib/survey/surveyTypes";

export type SubmitSurveyResult = { ok: true } | { ok: false; error: string };
export type SurveyDefinitionResult =
  | { ok: true; definition: SurveyDefinition }
  | { ok: false; error: string };
export type SaveSurveyDefinitionResult = { ok: true } | { ok: false; error: string };

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

/** Charge la définition depuis la base, avec repli sur le fichier versionné. */
export async function fetchSurveyDefinition(
  surveyId: string,
): Promise<SurveyDefinitionResult> {
  const fallback = getDefaultSurveyDefinition(surveyId);
  if (!fallback) {
    return { ok: false, error: "Questionnaire introuvable." };
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("survey_definitions")
    .select("definition")
    .eq("id", surveyId)
    .maybeSingle();

  if (error) {
    return { ok: true, definition: fallback };
  }

  const parsed = parseSurveyDefinition(data?.definition);
  return { ok: true, definition: parsed ?? fallback };
}

export async function saveSurveyDefinition(
  surveyId: string,
  definition: SurveyDefinition,
): Promise<SaveSurveyDefinitionResult> {
  const entry = getSurveyRegistryEntry(surveyId);
  if (!entry) {
    return { ok: false, error: "Questionnaire introuvable." };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.from("survey_definitions").upsert({
    id: surveyId,
    version: definition.version,
    title: definition.title,
    definition,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { ok: false, error: error.message ?? "Enregistrement impossible." };
  }

  revalidatePath("/questionnaire");
  revalidatePath("/questionnaire/reponses");
  revalidatePath(`/questionnaire/reponses/${surveyId}`);
  revalidatePath(`/questionnaire/reponses/${surveyId}/reponses`);
  revalidatePath(`/questionnaire/reponses/${surveyId}/edit`);
  return { ok: true };
}

/**
 * Enregistre une réponse au questionnaire de satisfaction.
 * Accessible sans compte (rôle anon) — les réponses sont anonymes par défaut.
 */
export async function submitSurveyResponse(
  input: SubmitSurveyInput,
): Promise<SubmitSurveyResult> {
  const surveyId = "satisfaction-2026";
  const defResult = await fetchSurveyDefinition(surveyId);
  if (!defResult.ok) {
    return { ok: false, error: defResult.error };
  }
  const definition = defResult.definition;

  const answers = input?.answers ?? {};
  const selectedPrestations = asStringArray(answers.q4);

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

  const supabase = await createServerSupabase();

  const { error } = await supabase.from("survey_responses").insert({
    survey_version: input.surveyVersion || definition.version,
    entity: asString(answers.q1),
    service: asString(answers.q2),
    prestations: selectedPrestations,
    satisfaction: asNumber(answers.q5),
    nps_score: asNumber(answers.q6),
    answers,
    respondent_name: input.respondentName?.trim() || null,
  });

  if (error) {
    return { ok: false, error: error.message ?? "Enregistrement de la réponse impossible." };
  }

  revalidatePath("/questionnaire/reponses");
  return { ok: true };
}
