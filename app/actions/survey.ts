"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "../../lib/server/supabaseServer";
import {
  isQuestionVisible,
  SURVEY_VERSION,
  satisfaction2026,
} from "../../lib/survey/satisfaction2026";
import type { SubmitSurveyInput, SurveyAnswers } from "../../lib/survey/surveyTypes";

export type SubmitSurveyResult = { ok: true } | { ok: false; error: string };

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

/**
 * Enregistre une réponse au questionnaire de satisfaction.
 * Accessible sans compte (rôle anon) — les réponses sont anonymes par défaut,
 * seul le nom (q23) est facultativement renseigné par le répondant.
 */
export async function submitSurveyResponse(
  input: SubmitSurveyInput,
): Promise<SubmitSurveyResult> {
  const answers = input?.answers ?? {};
  const selectedPrestations = asStringArray(answers.q4);

  // Validation légère : les questions requises et visibles doivent être remplies.
  for (const question of satisfaction2026.questions) {
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

    // Bornes des échelles.
    if ((question.type === "rating" || question.type === "nps") && question.scale) {
      const n = asNumber(value);
      if (n == null || n < question.scale.min || n > question.scale.max) {
        return { ok: false, error: "Une note saisie est invalide." };
      }
    }
  }

  const supabase = await createServerSupabase();

  const { error } = await supabase.from("survey_responses").insert({
    survey_version: input.surveyVersion || SURVEY_VERSION,
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
