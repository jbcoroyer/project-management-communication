import { satisfaction2026 } from "./satisfaction2026";
import { serviceInterne2026 } from "./serviceInterne2026";

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
  {
    id: "service-interne-2026",
    title: serviceInterne2026.title,
    version: serviceInterne2026.version,
    publicPath: "/questionnaire/f/service-interne-2026",
    description:
      "Questionnaire interne (membres du service Communication) sur le fonctionnement du service.",
    status: "active",
    createdAt: "2026-01-02",
  },
];

export function getSurveyRegistryEntry(id: string): SurveyRegistryEntry | undefined {
  return surveyRegistry.find((entry) => entry.id === id);
}

export function getDefaultSurveyDefinition(id: string) {
  if (id === "satisfaction-2026") return satisfaction2026;
  if (id === "service-interne-2026") return serviceInterne2026;
  return undefined;
}

/**
 * Chemin public du formulaire. Le questionnaire historique conserve /questionnaire
 * (liens déjà partagés) ; les nouveaux questionnaires vivent sous /questionnaire/f/[id].
 */
export function buildSurveyPublicPath(id: string): string {
  return id === "satisfaction-2026" ? "/questionnaire" : `/questionnaire/f/${id}`;
}
