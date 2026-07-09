import type { SurveyAnswers, SurveyResponse } from "./surveyTypes";

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean);
  return [];
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** DB (snake_case) → client (camelCase), suivant le pattern mapXxxRow du projet. */
export function mapSurveyResponseRow(row: unknown): SurveyResponse {
  const r = row as Record<string, unknown>;
  const rawAnswers = r.answers;
  const answers: SurveyAnswers =
    rawAnswers && typeof rawAnswers === "object" && !Array.isArray(rawAnswers)
      ? (rawAnswers as SurveyAnswers)
      : {};

  return {
    id: String(r.id ?? ""),
    createdAt: typeof r.created_at === "string" ? r.created_at : "",
    surveyVersion: typeof r.survey_version === "string" ? r.survey_version : "",
    entity: typeof r.entity === "string" ? r.entity : null,
    service: typeof r.service === "string" ? r.service : null,
    prestations: toStringArray(r.prestations),
    npsScore: toNumberOrNull(r.nps_score),
    satisfaction: toNumberOrNull(r.satisfaction),
    answers,
    respondentName:
      typeof r.respondent_name === "string" && r.respondent_name.trim() !== ""
        ? r.respondent_name
        : null,
  };
}
