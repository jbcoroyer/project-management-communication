import type { Question, SurveyDefinition } from "./surveyTypes";

export function findQuestion(
  definition: SurveyDefinition,
  id: string,
): Question | undefined {
  return definition.questions.find((q) => q.id === id);
}

/** Détermine si une question doit être affichée selon les prestations cochées (q4). */
export function isQuestionVisible(
  question: Question,
  selectedPrestations: readonly string[],
): boolean {
  if (!question.showIfPrestation) return true;
  return selectedPrestations.includes(question.showIfPrestation);
}
