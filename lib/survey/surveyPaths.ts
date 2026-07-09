/** Chemin public par défaut pour un questionnaire nouvellement créé. */
export function defaultPublicPathForSurvey(id: string): string {
  return `/questionnaire/f/${id}`;
}
