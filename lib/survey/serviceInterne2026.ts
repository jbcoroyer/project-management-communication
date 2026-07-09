import type { Question, SurveyDefinition, SurveyStep } from "./surveyTypes";

export const SERVICE_INTERNE_VERSION = "service-interne-2026";

/**
 * Questionnaire interne réservé aux membres du service Communication
 * (complément de l'entretien de novembre). Anonyme, partagé par lien.
 */
const questions: readonly Question[] = [
  // --- Section 1 : Organisation et répartition du travail ---
  {
    id: "q1",
    type: "single",
    section: 1,
    label: "Diriez-vous que les rôles et responsabilités de chacun sont clairs au sein du service ?",
    options: ["Tout à fait clairs", "Plutôt clairs", "Plutôt flous", "Pas clairs du tout"],
    required: true,
  },
  {
    id: "q2",
    type: "single",
    section: 1,
    label:
      "La répartition de la charge de travail entre les membres de l'équipe vous semble-t-elle équilibrée ?",
    options: ["Oui, équilibrée", "Plutôt oui", "Plutôt non", "Non, déséquilibrée"],
    required: true,
  },
  {
    id: "q3",
    type: "single",
    section: 1,
    label:
      "Avez-vous une visibilité suffisante sur les priorités du service à court terme (2-4 semaines) ?",
    options: ["Oui, claire", "Partielle", "Non, je découvre souvent au dernier moment"],
    required: true,
  },
  {
    id: "q4",
    type: "open",
    section: 1,
    label: "Qu'est-ce qui, dans l'organisation actuelle du travail, fonctionne bien selon vous ?",
    placeholder: "Ce qu'il faut absolument garder…",
  },
  {
    id: "q5",
    type: "open",
    section: 1,
    label: "Qu'est-ce qui vous semble le plus problématique dans cette organisation ?",
    placeholder: "Soyez direct, c'est utile pour progresser.",
  },

  // --- Section 2 : Outils et process ---
  {
    id: "q6",
    type: "single",
    section: 2,
    label:
      "Les outils utilisés au quotidien (gestion de projet, partage de fichiers, validation, etc.) sont-ils adaptés à vos besoins ?",
    options: ["Oui, tout à fait", "Globalement oui", "Partiellement", "Non, mal adaptés"],
    required: true,
  },
  {
    id: "q7",
    type: "single",
    section: 2,
    label:
      "Le circuit de validation des projets (relecture, BAT, aller-retours) vous semble-t-il :",
    options: [
      "Fluide et rapide",
      "Correct mais perfectible",
      "Souvent source de retard",
      "Un vrai point de blocage",
    ],
    required: true,
  },
  {
    id: "q8",
    type: "open",
    section: 2,
    label: "Y a-t-il un outil ou un process qui vous fait perdre du temps régulièrement ? Lequel, et pourquoi ?",
    placeholder: "Nommez l'outil / le process et la raison.",
  },
  {
    id: "q9",
    type: "open",
    section: 2,
    label: "Y a-t-il un outil ou process qui vous manque et qui faciliterait votre travail ?",
    placeholder: "Votre idée, même à l'état d'ébauche.",
  },

  // --- Section 3 : Communication interne au service ---
  {
    id: "q10",
    type: "single",
    section: 3,
    label:
      "Les informations importantes (deadlines, changements de brief, décisions) circulent-elles bien entre les membres de l'équipe ?",
    options: ["Toujours", "La plupart du temps", "Rarement", "Presque jamais"],
    required: true,
  },
  {
    id: "q11",
    type: "single",
    section: 3,
    label:
      "Aujourd'hui, il n'existe pas de point d'équipe défini. Pensez-vous qu'il faudrait en organiser plus régulièrement ?",
    options: ["Oui, clairement", "Plutôt oui", "Plutôt non", "Non, pas nécessaire"],
    required: true,
  },
  {
    id: "q12",
    type: "open",
    section: 3,
    label:
      "Si oui, quels sujets devraient y être abordés en priorité (avancement des projets, priorités, difficultés, actualités du service, autre) ?",
    placeholder: "Les sujets prioritaires selon vous.",
  },
  {
    id: "q13",
    type: "single",
    section: 3,
    label: "Vous sentez-vous à l'aise pour signaler un problème, un retard ou une surcharge de travail ?",
    options: ["Oui, facilement", "Plutôt oui", "Plutôt non", "Non, difficilement"],
    required: true,
  },
  {
    id: "q14",
    type: "open",
    section: 3,
    label: "Qu'est-ce qui pourrait améliorer la communication au sein de l'équipe ?",
    placeholder: "Une idée concrète, un rituel, un outil…",
  },

  // --- Section 4 : Charge de travail et conditions de travail ---
  {
    id: "q15",
    type: "single",
    section: 4,
    label: "Sur les dernières semaines, votre charge de travail vous a semblé :",
    options: ["Trop légère", "Correcte", "Élevée mais gérable", "Trop lourde"],
    required: true,
  },
  {
    id: "q16",
    type: "single",
    section: 4,
    label:
      "Avez-vous le sentiment de pouvoir respecter les délais qui vous sont fixés dans de bonnes conditions ?",
    options: ["Oui, systématiquement", "La plupart du temps", "Rarement", "Non, jamais"],
    required: true,
  },
  {
    id: "q17",
    type: "open",
    section: 4,
    label: "Y a-t-il une période ou un type de projet qui génère régulièrement une surcharge évitable ?",
    placeholder: "Décrivez la période ou le type de projet.",
  },

  // --- Section 5 : Reconnaissance ---
  {
    id: "q18",
    type: "single",
    section: 5,
    label: "Avez-vous le sentiment que votre travail est reconnu à sa juste valeur au sein du service ?",
    options: ["Oui, tout à fait", "Plutôt oui", "Plutôt non", "Non, pas du tout"],
    required: true,
  },

  // --- Section 6 : Bilan global ---
  {
    id: "q19",
    type: "open",
    section: 6,
    label: "Si vous deviez ne garder qu'une seule chose qui fonctionne bien dans le service, ce serait :",
    placeholder: "La force n°1 du service.",
  },
  {
    id: "q20",
    type: "open",
    section: 6,
    label: "Si vous deviez changer une seule chose dans le fonctionnement du service, ce serait :",
    placeholder: "La priorité n°1 d'amélioration.",
  },
  {
    id: "q21",
    type: "rating",
    section: 6,
    label:
      "Sur une échelle de 1 à 10, quel est votre niveau de satisfaction générale par rapport au fonctionnement actuel du service ?",
    scale: { min: 1, max: 10 },
    scaleLabels: { min: "Pas du tout satisfait", max: "Très satisfait" },
    required: true,
  },
  {
    id: "q22",
    type: "open",
    section: 6,
    label: "Autre chose que vous souhaitez ajouter, qui n'a pas été couvert par ce questionnaire ?",
    placeholder: "Le mot de la fin vous appartient.",
  },
] as const;

const steps: readonly SurveyStep[] = [
  {
    id: "organisation",
    title: "Organisation & répartition du travail",
    subtitle: "Rôles, charge et visibilité sur les priorités.",
    questionIds: ["q1", "q2", "q3", "q4", "q5"],
  },
  {
    id: "outils",
    title: "Outils & process",
    subtitle: "Ce qui fluidifie ou freine le travail au quotidien.",
    questionIds: ["q6", "q7", "q8", "q9"],
  },
  {
    id: "communication",
    title: "Communication interne au service",
    subtitle: "La circulation de l'information dans l'équipe.",
    questionIds: ["q10", "q11", "q12", "q13", "q14"],
  },
  {
    id: "charge",
    title: "Charge & conditions de travail",
    subtitle: "Votre ressenti sur le rythme et les délais.",
    questionIds: ["q15", "q16", "q17"],
  },
  {
    id: "reconnaissance",
    title: "Reconnaissance",
    subtitle: "Le sentiment de reconnaissance de votre travail.",
    questionIds: ["q18"],
  },
  {
    id: "bilan",
    title: "Bilan global",
    subtitle: "Votre synthèse, en toute franchise.",
    questionIds: ["q19", "q20", "q21", "q22"],
  },
] as const;

export const serviceInterne2026: SurveyDefinition = {
  version: SERVICE_INTERNE_VERSION,
  title: "Questionnaire interne — Fonctionnement du service Communication",
  intro: {
    title: "Fonctionnement du service : votre regard",
    subtitle:
      "Questionnaire anonyme, en complément de l'entretien de novembre. Objectif : identifier ce qui fonctionne bien et ce qui peut être amélioré. Comptez 10 à 15 minutes, en toute franchise.",
    estimatedMinutes: 12,
  },
  questions,
  steps,
};
