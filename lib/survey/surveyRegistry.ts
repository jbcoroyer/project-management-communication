import { satisfaction2026 } from "./satisfaction2026";

export type SurveyRegistryEntry = {
  id: string;
  title: string;
  version: string;
  publicPath: string;
  description: string;
  status: "active" | "draft";
  createdAt: string;
};

/** Registre des questionnaires gérés dans l'application. */
export const surveyRegistry: readonly SurveyRegistryEntry[] = [
  {
    id: "satisfaction-2026",
    title: satisfaction2026.title,
    version: satisfaction2026.version,
    publicPath: "/questionnaire",
    description: "Questionnaire annuel de satisfaction du service Communication IDENA.",
    status: "active",
    createdAt: "2026-01-01",
  },
];

export function getSurveyRegistryEntry(id: string): SurveyRegistryEntry | undefined {
  return surveyRegistry.find((entry) => entry.id === id);
}

export function getDefaultSurveyDefinition(id: string) {
  if (id === "satisfaction-2026") return satisfaction2026;
  return undefined;
}

/**
 * Chemin public du formulaire. Le questionnaire historique conserve /questionnaire
 * (liens déjà partagés) ; les nouveaux questionnaires vivent sous /questionnaire/f/[id].
 */
export function buildSurveyPublicPath(id: string): string {
  return id === "satisfaction-2026" ? "/questionnaire" : `/questionnaire/f/${id}`;
}
