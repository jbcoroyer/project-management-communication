import { findQuestion } from "./surveyDefinitionUtils";
import type { SurveyDefinition, SurveyResponse } from "./surveyTypes";

export type NpsBreakdown = {
  total: number;
  promoters: number;
  passives: number;
  detractors: number;
  /** Score NPS arrondi (−100 à +100), null si aucune réponse notée. */
  score: number | null;
};

export type RatingStat = {
  questionId: string;
  label: string;
  scaleMax: number;
  average: number | null;
  count: number;
};

export type ChoiceDistribution = {
  questionId: string;
  label: string;
  entries: { option: string; count: number }[];
};

/** NPS = % promoteurs (9-10) − % détracteurs (0-6). */
export function computeNps(responses: readonly SurveyResponse[]): NpsBreakdown {
  const scores = responses
    .map((r) => r.npsScore)
    .filter((s): s is number => typeof s === "number" && Number.isFinite(s));

  const total = scores.length;
  if (total === 0) {
    return { total: 0, promoters: 0, passives: 0, detractors: 0, score: null };
  }

  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  for (const s of scores) {
    if (s >= 9) promoters += 1;
    else if (s >= 7) passives += 1;
    else detractors += 1;
  }

  const score = Math.round(((promoters - detractors) / total) * 100);
  return { total, promoters, passives, detractors, score };
}

/** Moyenne de satisfaction générale (q5, échelle 1-10). */
export function computeSatisfactionAverage(responses: readonly SurveyResponse[]): number | null {
  const values = responses
    .map((r) => r.satisfaction)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Moyennes de toutes les questions de type rating (hors NPS). */
export function computeRatingStats(
  responses: readonly SurveyResponse[],
  definition: SurveyDefinition,
): RatingStat[] {
  return definition.questions
    .filter((q) => q.type === "rating")
    .map((q) => {
      const values = responses
        .map((r) => {
          const raw = r.answers[q.id];
          return typeof raw === "number" ? raw : null;
        })
        .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
      const average =
        values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
      return {
        questionId: q.id,
        label: q.label,
        scaleMax: q.scale?.max ?? 5,
        average,
        count: values.length,
      };
    });
}

/** Répartition des réponses pour toutes les questions fermées (single/multiple). */
export function computeChoiceDistributions(
  responses: readonly SurveyResponse[],
  definition: SurveyDefinition,
): ChoiceDistribution[] {
  return definition.questions
    .filter((q) => (q.type === "single" || q.type === "multiple") && q.options)
    .map((q) => {
      const counts = new Map<string, number>();
      for (const opt of q.options ?? []) counts.set(opt, 0);
      for (const r of responses) {
        const raw = r.answers[q.id];
        const picked = Array.isArray(raw) ? raw : raw != null ? [String(raw)] : [];
        for (const value of picked) {
          counts.set(value, (counts.get(value) ?? 0) + 1);
        }
      }
      return {
        questionId: q.id,
        label: q.label,
        entries: Array.from(counts.entries()).map(([option, count]) => ({ option, count })),
      };
    });
}

export type Verbatim = {
  responseId: string;
  createdAt: string;
  questionId: string;
  questionLabel: string;
  text: string;
  respondentName: string | null;
  entity: string | null;
  service: string | null;
};

/** Aplati toutes les réponses ouvertes en une liste de verbatims. */
export function collectVerbatims(
  responses: readonly SurveyResponse[],
  definition: SurveyDefinition,
): Verbatim[] {
  const openQuestionIds = definition.questions
    .filter((q) => q.type === "open")
    .map((q) => q.id);

  const out: Verbatim[] = [];
  for (const r of responses) {
    for (const qid of openQuestionIds) {
      const raw = r.answers[qid];
      const text = typeof raw === "string" ? raw.trim() : "";
      if (!text) continue;
      out.push({
        responseId: r.id,
        createdAt: r.createdAt,
        questionId: qid,
        questionLabel: findQuestion(definition, qid)?.label ?? qid,
        text,
        respondentName: r.respondentName,
        entity: r.entity,
        service: r.service,
      });
    }
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
