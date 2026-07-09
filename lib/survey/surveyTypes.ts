/**
 * Types partagés du module "Questionnaire de satisfaction".
 * La définition du questionnaire (lib/survey/satisfaction2026.ts) est la source
 * de vérité unique : le formulaire, la soumission et l'agrégation en dérivent.
 */

export type QuestionType =
  | "single" // choix unique (radio)
  | "multiple" // choix multiple (checkboxes)
  | "rating" // échelle bornée (ex. 1-5 ou 1-10)
  | "nps" // échelle 0-10 (recommandation)
  | "open" // réponse libre (textarea)
  | "text"; // champ court libre (ex. nom, facultatif)

export type Question = {
  /** Identifiant stable, conservé même si le questionnaire évolue (ex. "q1"). */
  id: string;
  type: QuestionType;
  label: string;
  /** Précision affichée sous la question. */
  help?: string;
  /** Numéro de section d'origine (1..7). */
  section: number;
  required?: boolean;
  /** Options pour les types single / multiple. */
  options?: readonly string[];
  /** Bornes pour les types rating / nps. */
  scale?: { min: number; max: number };
  /** Étiquettes des extrémités d'échelle (rating / nps). */
  scaleLabels?: { min: string; max: string };
  /**
   * Logique conditionnelle : la question ne s'affiche que si cette prestation
   * (option de la question q4) a été cochée.
   */
  showIfPrestation?: string;
  /** Placeholder pour les champs texte / ouverts. */
  placeholder?: string;
};

export type SurveyStep = {
  id: string;
  /** Titre court de l'écran. */
  title: string;
  /** Sous-titre / accroche de l'écran. */
  subtitle?: string;
  /** Identifiants des questions affichées sur cet écran. */
  questionIds: readonly string[];
};

export type SurveyDefinition = {
  /** Version stockée en base (survey_version) — bumper si le questionnaire change. */
  version: string;
  title: string;
  intro: {
    title: string;
    subtitle: string;
    estimatedMinutes: number;
  };
  questions: readonly Question[];
  steps: readonly SurveyStep[];
};

/** Une réponse individuelle : clé = id de question. */
export type SurveyAnswers = Record<string, string | number | string[] | undefined>;

/** Réponse telle que lue depuis la base (après mapSurveyResponseRow). */
export type SurveyResponse = {
  id: string;
  createdAt: string;
  surveyVersion: string;
  entity: string | null;
  service: string | null;
  prestations: string[];
  npsScore: number | null;
  satisfaction: number | null;
  answers: SurveyAnswers;
  respondentName: string | null;
};

/** Payload envoyé à la Server Action de soumission. */
export type SubmitSurveyInput = {
  surveyVersion: string;
  answers: SurveyAnswers;
  respondentName?: string | null;
};
