import { satisfaction2026 } from "./satisfaction2026";
import type { SurveyResponse } from "./surveyTypes";

function csvEscape(value: string | number | null | undefined): string {
  const normalized = String(value ?? "");
  return `"${normalized.replace(/"/g, '""')}"`;
}

function formatAnswer(value: string | number | string[] | undefined): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.join(" ; ");
  return String(value);
}

/** Une colonne par question + méta (date, entité, service, nom). */
export function surveyResponsesToCsv(responses: readonly SurveyResponse[]): string {
  // Le champ nom (type "text") est exporté à part via respondent_name.
  const questions = satisfaction2026.questions.filter((q) => q.type !== "text");

  const headers = [
    "Date",
    "Entité",
    "Service",
    ...questions.map((q) => q.label),
    "Nom (facultatif)",
  ];

  const lines = responses.map((r) => {
    const cells: (string | number | null)[] = [
      r.createdAt,
      r.entity ?? "",
      r.service ?? "",
      ...questions.map((q) => formatAnswer(r.answers[q.id])),
      r.respondentName ?? "",
    ];
    return cells.map(csvEscape).join(",");
  });

  return [headers.map(csvEscape).join(","), ...lines].join("\n");
}
