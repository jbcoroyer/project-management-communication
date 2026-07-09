import type { Question, QuestionType, SurveyDefinition, SurveyStep } from "./surveyTypes";

export function findQuestion(
  definition: SurveyDefinition,
  id: string,
): Question | undefined {
  return definition.questions.find((q) => q.id === id);
}

/** Génère un identifiant de question unique et stable. */
export function generateQuestionId(): string {
  return `q_${Math.random().toString(36).slice(2, 9)}`;
}

/** Section de travail pour l'éditeur : un écran = un groupe de questions. */
export type EditorSection = {
  key: string;
  title: string;
  subtitle: string;
  questions: Question[];
};

/** Construit le modèle éditable (sections) à partir d'une définition. */
export function buildEditorSections(definition: SurveyDefinition): EditorSection[] {
  const byId = new Map(definition.questions.map((q) => [q.id, q]));
  const used = new Set<string>();

  const sections: EditorSection[] = definition.steps.map((step, index) => {
    const questions = step.questionIds
      .map((id) => byId.get(id))
      .filter((q): q is Question => Boolean(q));
    for (const q of questions) used.add(q.id);
    return {
      key: step.id || `section-${index + 1}`,
      title: step.title,
      subtitle: step.subtitle ?? "",
      questions: questions.map((q) => ({ ...q })),
    };
  });

  // Questions orphelines (non rattachées à un écran) : ajoutées à une section dédiée.
  const orphans = definition.questions.filter((q) => !used.has(q.id));
  if (orphans.length > 0) {
    sections.push({
      key: `section-${sections.length + 1}`,
      title: "Autres questions",
      subtitle: "",
      questions: orphans.map((q) => ({ ...q })),
    });
  }

  return sections;
}

/** Reconstruit une définition complète à partir des sections éditées. */
export function sectionsToDefinition(
  base: SurveyDefinition,
  sections: EditorSection[],
): SurveyDefinition {
  const steps: SurveyStep[] = [];
  const questions: Question[] = [];

  sections.forEach((section, index) => {
    const sectionNumber = index + 1;
    const questionIds: string[] = [];
    for (const q of section.questions) {
      const normalized: Question = { ...q, section: sectionNumber };
      questions.push(normalized);
      questionIds.push(normalized.id);
    }
    steps.push({
      id: section.key || `section-${sectionNumber}`,
      title: section.title.trim() || `Section ${sectionNumber}`,
      subtitle: section.subtitle.trim() || undefined,
      questionIds,
    });
  });

  return { ...base, steps, questions };
}

/** Crée une nouvelle question vierge du type demandé. */
export function createBlankQuestion(type: QuestionType, section: number): Question {
  const base: Question = {
    id: generateQuestionId(),
    type,
    section,
    label: "Nouvelle question",
    required: false,
  };
  if (type === "single" || type === "multiple") {
    base.options = ["Option 1", "Option 2"];
  }
  if (type === "rating") {
    base.scale = { min: 1, max: 5 };
  }
  if (type === "nps") {
    base.scale = { min: 0, max: 10 };
  }
  return base;
}

/** Définition de départ pour un nouveau questionnaire créé depuis le dashboard. */
export function createStarterDefinition(id: string, title: string): SurveyDefinition {
  const firstQuestionId = generateQuestionId();
  return {
    version: id,
    title,
    intro: {
      title,
      subtitle: "Merci de prendre quelques minutes pour répondre à ce questionnaire.",
      estimatedMinutes: 2,
    },
    questions: [
      {
        id: firstQuestionId,
        type: "single",
        section: 1,
        label: "Votre première question",
        required: false,
        options: ["Option 1", "Option 2"],
      },
    ],
    steps: [
      {
        id: "section-1",
        title: "Section 1",
        subtitle: "",
        questionIds: [firstQuestionId],
      },
    ],
  };
}

/** Nettoie une question quand son type change (retire les champs inutiles). */
export function normalizeQuestionForType(question: Question, type: QuestionType): Question {
  const next: Question = { ...question, type };
  if (type === "single" || type === "multiple") {
    next.options = question.options && question.options.length > 0 ? question.options : ["Option 1"];
    delete next.scale;
    delete next.scaleLabels;
  } else if (type === "rating") {
    next.scale = question.scale ?? { min: 1, max: 5 };
    delete next.options;
  } else if (type === "nps") {
    next.scale = question.scale ?? { min: 0, max: 10 };
    delete next.options;
  } else {
    // open / text
    delete next.options;
    delete next.scale;
    delete next.scaleLabels;
  }
  return next;
}

/** Détermine si une question doit être affichée selon les prestations cochées (q4). */
export function isQuestionVisible(
  question: Question,
  selectedPrestations: readonly string[],
): boolean {
  if (!question.showIfPrestation) return true;
  return selectedPrestations.includes(question.showIfPrestation);
}
