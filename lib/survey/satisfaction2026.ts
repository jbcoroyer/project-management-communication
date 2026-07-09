import { defaultCompanies } from "../types";
import type { Question, SurveyDefinition, SurveyStep } from "./surveyTypes";

export { isQuestionVisible } from "./surveyDefinitionUtils";

export const SURVEY_VERSION = "satisfaction-2026";

/** Réponse neutre proposée sur plusieurs questions fermées. */
export const NO_OPINION = "Je ne me prononce pas";

/**
 * Options de la question q4 (prestations). Les valeurs servent aussi de clé
 * pour la logique conditionnelle de la section 4 (showIfPrestation).
 */
export const PRESTATION_PRINT = "Supports print/PLV";
export const PRESTATION_SOCIAL = "Réseaux sociaux";
export const PRESTATION_EVENT = "Événements/salons";
export const PRESTATION_INTERNAL = "Communication interne";
export const PRESTATION_OTHER = "Autre";

const PRESTATION_OPTIONS = [
  PRESTATION_PRINT,
  PRESTATION_SOCIAL,
  PRESTATION_EVENT,
  PRESTATION_INTERNAL,
  PRESTATION_OTHER,
] as const;

/** Entités = 8 sociétés du groupe + option neutre. */
const ENTITY_OPTIONS = [...defaultCompanies, NO_OPINION] as const;

const SERVICE_OPTIONS = [
  "Direction",
  "RH",
  "Commercial",
  "Marketing",
  "R&D",
  "Production",
  "Qualité",
  "Autre",
  NO_OPINION,
] as const;

/**
 * Les 21 questions actives (numérotation d'origine conservée : q16 et q20 ont
 * été supprimées du questionnaire). Les libellés d'options des questions q7,
 * q8, q11, q13 et q17 sont des propositions par défaut, ajustables ici.
 */
const questions: readonly Question[] = [
  // --- Section 1 : Profil du répondant ---
  {
    id: "q1",
    type: "single",
    section: 1,
    label: "À quelle entité êtes-vous rattaché·e ?",
    options: ENTITY_OPTIONS,
    required: true,
  },
  {
    id: "q2",
    type: "single",
    section: 1,
    label: "Quel est votre service / département ?",
    options: SERVICE_OPTIONS,
    required: true,
  },
  {
    id: "q3",
    type: "single",
    section: 1,
    label: "À quelle fréquence sollicitez-vous le service Communication ?",
    options: ["Chaque semaine", "Chaque mois", "Quelques fois par an", "Rarement voire jamais"],
    required: true,
  },
  {
    id: "q4",
    type: "multiple",
    section: 1,
    label: "Quel(s) type(s) de prestation avez-vous déjà demandé ?",
    help: "Plusieurs choix possibles.",
    options: PRESTATION_OPTIONS,
    required: true,
  },

  // --- Section 2 : Satisfaction globale ---
  {
    id: "q5",
    type: "rating",
    section: 2,
    label: "Globalement, quel est votre niveau de satisfaction ?",
    scale: { min: 1, max: 10 },
    scaleLabels: { min: "Pas du tout satisfait", max: "Très satisfait" },
    required: true,
  },
  {
    id: "q6",
    type: "nps",
    section: 2,
    label: "Recommanderiez-vous le service Communication à un collègue ?",
    help: "0 = pas du tout probable, 10 = tout à fait probable.",
    scale: { min: 0, max: 10 },
    scaleLabels: { min: "Pas du tout probable", max: "Tout à fait probable" },
    required: true,
  },
  {
    id: "q7",
    type: "single",
    section: 2,
    label: "Comment jugez-vous l'évolution du service sur les 12 derniers mois ?",
    options: [
      "Nettement amélioré",
      "Plutôt amélioré",
      "Stable",
      "Plutôt dégradé",
      "Nettement dégradé",
      NO_OPINION,
    ],
    required: true,
  },

  // --- Section 3 : Qualité et réactivité ---
  {
    id: "q8",
    type: "single",
    section: 3,
    label: "Comment évaluez-vous le délai de traitement de vos demandes ?",
    options: ["Très rapide", "Satisfaisant", "Parfois trop long", "Souvent trop long", NO_OPINION],
    required: true,
  },
  {
    id: "q9",
    type: "rating",
    section: 3,
    label: "Quelle note donnez-vous à la qualité du rendu final ?",
    scale: { min: 1, max: 5 },
    scaleLabels: { min: "Insuffisante", max: "Excellente" },
    required: true,
  },
  {
    id: "q10",
    type: "rating",
    section: 3,
    label: "Quelle note donnez-vous à la clarté de la communication pendant le projet ?",
    scale: { min: 1, max: 5 },
    scaleLabels: { min: "Peu claire", max: "Très claire" },
    required: true,
  },
  {
    id: "q11",
    type: "single",
    section: 3,
    label: "La formulation de votre demande a-t-elle été facile ?",
    options: ["Très facile", "Plutôt facile", "Plutôt difficile", "Très difficile", NO_OPINION],
    required: true,
  },

  // --- Section 4 : Par typologie (conditionnel selon q4) ---
  {
    id: "q12",
    type: "rating",
    section: 4,
    label: "Print / PLV : quelle note donnez-vous à cette prestation ?",
    scale: { min: 1, max: 5 },
    scaleLabels: { min: "Insuffisante", max: "Excellente" },
    showIfPrestation: PRESTATION_PRINT,
    required: true,
  },
  {
    id: "q13",
    type: "single",
    section: 4,
    label: "Réseaux sociaux : quel est votre niveau de satisfaction ?",
    options: [
      "Très satisfait",
      "Plutôt satisfait",
      "Plutôt insatisfait",
      "Très insatisfait",
      NO_OPINION,
    ],
    showIfPrestation: PRESTATION_SOCIAL,
    required: true,
  },
  {
    id: "q14",
    type: "rating",
    section: 4,
    label: "Événements / salons : quelle note donnez-vous à cette prestation ?",
    scale: { min: 1, max: 5 },
    scaleLabels: { min: "Insuffisante", max: "Excellente" },
    showIfPrestation: PRESTATION_EVENT,
    required: true,
  },
  {
    id: "q15",
    type: "rating",
    section: 4,
    label: "Communication interne : quelle note donnez-vous à cette prestation ?",
    scale: { min: 1, max: 5 },
    scaleLabels: { min: "Insuffisante", max: "Excellente" },
    showIfPrestation: PRESTATION_INTERNAL,
    required: true,
  },

  // --- Section 5 : Relation et posture du service ---
  {
    id: "q17",
    type: "single",
    section: 5,
    label: "Vous sentez-vous informé·e des actions du service à l'échelle du groupe ?",
    options: ["Oui tout à fait", "Plutôt oui", "Plutôt non", "Pas du tout", NO_OPINION],
    required: true,
  },

  // --- Section 6 : Effet étonnement ---
  {
    id: "q18",
    type: "open",
    section: 6,
    label: "Qu'est-ce qui vous a agréablement surpris ?",
    placeholder: "Une prestation, un moment, une attention…",
  },
  {
    id: "q19",
    type: "open",
    section: 6,
    label: "Qu'est-ce qui vous a déçu ou surpris négativement ?",
    placeholder: "Soyez direct, c'est utile pour progresser.",
  },

  // --- Section 7 : Suggestions ---
  {
    id: "q21",
    type: "open",
    section: 7,
    label: "Un support ou un service que vous souhaiteriez et qui n'existe pas encore ?",
    placeholder: "Votre idée, même à l'état d'ébauche.",
  },
  {
    id: "q22",
    type: "open",
    section: 7,
    label: "S'il y avait une seule chose à améliorer, laquelle ?",
    placeholder: "La priorité n°1 selon vous.",
  },
  {
    id: "q23",
    type: "text",
    section: 7,
    label: "Nom et prénom (facultatif)",
    help: "Vous pouvez laisser votre nom si vous souhaitez qu'on revienne vers vous, sinon vos réponses restent totalement libres et anonymes. Pas d'email, aucune obligation.",
    placeholder: "Prénom Nom",
  },
] as const;

const steps: readonly SurveyStep[] = [
  {
    id: "profil",
    title: "Faisons connaissance",
    subtitle: "Quelques repères pour situer votre point de vue.",
    questionIds: ["q1", "q2", "q3", "q4"],
  },
  {
    id: "satisfaction",
    title: "Votre satisfaction globale",
    subtitle: "L'essentiel, en trois questions.",
    questionIds: ["q5", "q6", "q7"],
  },
  {
    id: "qualite",
    title: "Qualité & réactivité",
    subtitle: "Comment se passent concrètement vos projets ?",
    questionIds: ["q8", "q9", "q10", "q11"],
  },
  {
    id: "typologie",
    title: "Par type de prestation",
    subtitle: "On zoome sur ce que vous avez déjà demandé.",
    questionIds: ["q12", "q13", "q14", "q15"],
  },
  {
    id: "relation",
    title: "Relation & posture",
    subtitle: "Le service à l'échelle du groupe.",
    questionIds: ["q17"],
  },
  {
    id: "etonnement",
    title: "Effet étonnement",
    subtitle: "Ce qui vous a marqué, en bien comme en mal.",
    questionIds: ["q18", "q19"],
  },
  {
    id: "suggestions",
    title: "Vos suggestions",
    subtitle: "Le mot de la fin vous appartient.",
    questionIds: ["q21", "q22", "q23"],
  },
] as const;

export const satisfaction2026: SurveyDefinition = {
  version: SURVEY_VERSION,
  title: "Questionnaire de satisfaction — Service Communication",
  intro: {
    title: "Votre avis compte vraiment",
    subtitle:
      "5 minutes pour nous aider à faire progresser le service Communication. Réponses anonymes par défaut.",
    estimatedMinutes: 5,
  },
  questions,
  steps,
};

/** Accès direct à une question par id. */
export function getQuestion(id: string): Question | undefined {
  return questions.find((q) => q.id === id);
}

