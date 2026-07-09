"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { saveSurveyDefinition } from "../../../app/actions/survey";
import {
  buildEditorSections,
  createBlankQuestion,
  generateQuestionId,
  normalizeQuestionForType,
  sectionsToDefinition,
  type EditorSection,
} from "../../../lib/survey/surveyDefinitionUtils";
import { getSurveyRegistryEntry } from "../../../lib/survey/surveyRegistry";
import type { Question, QuestionType, SurveyDefinition } from "../../../lib/survey/surveyTypes";
import { toastError, toastSuccess } from "../../../lib/toast";
import { useConfirm } from "../../ui/ConfirmDialog";

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: "single", label: "Choix unique" },
  { value: "multiple", label: "Choix multiple" },
  { value: "rating", label: "Note (étoiles / échelle)" },
  { value: "nps", label: "Recommandation (NPS 0-10)" },
  { value: "open", label: "Texte libre (long)" },
  { value: "text", label: "Champ court" },
];

type SurveyEditorWorkspaceProps = {
  surveyId: string;
  initialDefinition: SurveyDefinition;
};

const inputClass =
  "ui-focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]";
const labelClass = "flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/55";

export default function SurveyEditorWorkspace({
  surveyId,
  initialDefinition,
}: SurveyEditorWorkspaceProps) {
  const entry = getSurveyRegistryEntry(surveyId);
  const confirm = useConfirm();
  const [intro, setIntro] = useState(() => ({ ...initialDefinition.intro }));
  const [sections, setSections] = useState<EditorSection[]>(() =>
    buildEditorSections(initialDefinition),
  );
  const [saving, setSaving] = useState(false);

  // Options de la question "prestations" (q4) pour la logique conditionnelle.
  const prestationOptions = useMemo(() => {
    for (const s of sections) {
      const q4 = s.questions.find((q) => q.id === "q4");
      if (q4?.options) return q4.options;
    }
    return [];
  }, [sections]);

  const mutateSection = (index: number, patch: Partial<EditorSection>) => {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const mutateQuestion = (sectionIndex: number, questionIndex: number, patch: Partial<Question>) => {
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sectionIndex) return s;
        return {
          ...s,
          questions: s.questions.map((q, qi) => (qi === questionIndex ? { ...q, ...patch } : q)),
        };
      }),
    );
  };

  const changeQuestionType = (sectionIndex: number, questionIndex: number, type: QuestionType) => {
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sectionIndex) return s;
        return {
          ...s,
          questions: s.questions.map((q, qi) =>
            qi === questionIndex ? normalizeQuestionForType(q, type) : q,
          ),
        };
      }),
    );
  };

  const addQuestion = (sectionIndex: number) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIndex
          ? { ...s, questions: [...s.questions, createBlankQuestion("single", i + 1)] }
          : s,
      ),
    );
  };

  const duplicateQuestion = (sectionIndex: number, questionIndex: number) => {
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sectionIndex) return s;
        const source = s.questions[questionIndex];
        const copy: Question = { ...source, id: generateQuestionId(), label: `${source.label} (copie)` };
        const next = [...s.questions];
        next.splice(questionIndex + 1, 0, copy);
        return { ...s, questions: next };
      }),
    );
  };

  const removeQuestion = async (sectionIndex: number, questionIndex: number) => {
    const ok = await confirm({
      title: "Supprimer cette question ?",
      description: "La question sera retirée du questionnaire.",
      confirmLabel: "Supprimer",
      variant: "destructive",
    });
    if (!ok) return;
    setSections((prev) =>
      prev.map((s, i) =>
        i === sectionIndex
          ? { ...s, questions: s.questions.filter((_, qi) => qi !== questionIndex) }
          : s,
      ),
    );
  };

  const moveQuestion = (sectionIndex: number, questionIndex: number, dir: -1 | 1) => {
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sectionIndex) return s;
        const target = questionIndex + dir;
        if (target < 0 || target >= s.questions.length) return s;
        const next = [...s.questions];
        [next[questionIndex], next[target]] = [next[target], next[questionIndex]];
        return { ...s, questions: next };
      }),
    );
  };

  const moveSection = (sectionIndex: number, dir: -1 | 1) => {
    setSections((prev) => {
      const target = sectionIndex + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[sectionIndex], next[target]] = [next[target], next[sectionIndex]];
      return next;
    });
  };

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        key: `section-${Date.now()}`,
        title: `Section ${prev.length + 1}`,
        subtitle: "",
        questions: [],
      },
    ]);
  };

  const removeSection = async (sectionIndex: number) => {
    const ok = await confirm({
      title: "Supprimer cet écran ?",
      description: "L'écran et toutes ses questions seront supprimés.",
      confirmLabel: "Supprimer",
      variant: "destructive",
    });
    if (!ok) return;
    setSections((prev) => prev.filter((_, i) => i !== sectionIndex));
  };

  // --- Options (choix unique / multiple) ---
  const setOption = (sectionIndex: number, questionIndex: number, optIndex: number, value: string) => {
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sectionIndex) return s;
        return {
          ...s,
          questions: s.questions.map((q, qi) => {
            if (qi !== questionIndex) return q;
            const options = [...(q.options ?? [])];
            options[optIndex] = value;
            return { ...q, options };
          }),
        };
      }),
    );
  };

  const addOption = (sectionIndex: number, questionIndex: number) => {
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sectionIndex) return s;
        return {
          ...s,
          questions: s.questions.map((q, qi) =>
            qi === questionIndex
              ? { ...q, options: [...(q.options ?? []), `Option ${(q.options?.length ?? 0) + 1}`] }
              : q,
          ),
        };
      }),
    );
  };

  const removeOption = (sectionIndex: number, questionIndex: number, optIndex: number) => {
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sectionIndex) return s;
        return {
          ...s,
          questions: s.questions.map((q, qi) =>
            qi === questionIndex
              ? { ...q, options: (q.options ?? []).filter((_, oi) => oi !== optIndex) }
              : q,
          ),
        };
      }),
    );
  };

  const handleSave = async () => {
    const hasEmptyLabel = sections.some((s) => s.questions.some((q) => !q.label.trim()));
    if (hasEmptyLabel) {
      toastError("Chaque question doit avoir un intitulé.");
      return;
    }
    setSaving(true);
    const definition = sectionsToDefinition({ ...initialDefinition, intro }, sections);
    const result = await saveSurveyDefinition(surveyId, definition);
    setSaving(false);
    if (!result.ok) {
      toastError(result.error);
      return;
    }
    toastSuccess("Questionnaire enregistré.");
  };

  if (!entry) {
    return <p className="text-sm text-[color:var(--foreground)]/55">Questionnaire introuvable.</p>;
  }

  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);

  return (
    <div className="space-y-5">
      <header className="ui-surface sticky top-2 z-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
        <div>
          <Link
            href={`/questionnaire/reponses/${surveyId}`}
            className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--foreground)]/50 hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour au questionnaire
          </Link>
          <h1 className="ui-display text-2xl text-[var(--foreground)]">Éditeur de formulaire</h1>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/60">
            {entry.title} · {sections.length} écran{sections.length !== 1 ? "s" : ""} ·{" "}
            {totalQuestions} question{totalQuestions !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="ui-btn ui-btn-primary gap-2"
        >
          <Save className="h-4 w-4" />
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </header>

      <section className="ui-surface space-y-4 rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Écran d&apos;accueil</h2>
        <label className={labelClass}>
          Titre d&apos;accueil
          <input
            value={intro.title}
            onChange={(e) => setIntro((prev) => ({ ...prev, title: e.target.value }))}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          Sous-titre
          <textarea
            value={intro.subtitle}
            onChange={(e) => setIntro((prev) => ({ ...prev, subtitle: e.target.value }))}
            rows={2}
            className={`${inputClass} resize-y`}
          />
        </label>
      </section>

      {sections.map((section, sectionIndex) => (
        <section key={section.key} className="ui-surface space-y-4 rounded-2xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] pb-4">
            <div className="flex-1 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-[color:var(--foreground)]/40">
                Écran {sectionIndex + 1}
              </span>
              <input
                value={section.title}
                onChange={(e) => mutateSection(sectionIndex, { title: e.target.value })}
                placeholder="Titre de l'écran"
                className={`${inputClass} font-semibold`}
              />
              <input
                value={section.subtitle}
                onChange={(e) => mutateSection(sectionIndex, { subtitle: e.target.value })}
                placeholder="Sous-titre (facultatif)"
                className={inputClass}
              />
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveSection(sectionIndex, -1)}
                disabled={sectionIndex === 0}
                className="ui-btn ui-btn-ghost h-8 w-8 p-0 disabled:opacity-30"
                aria-label="Monter l'écran"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => moveSection(sectionIndex, 1)}
                disabled={sectionIndex === sections.length - 1}
                className="ui-btn ui-btn-ghost h-8 w-8 p-0 disabled:opacity-30"
                aria-label="Descendre l'écran"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => void removeSection(sectionIndex)}
                className="ui-btn ui-btn-ghost h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
                aria-label="Supprimer l'écran"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {section.questions.map((question, questionIndex) => (
            <div
              key={question.id}
              className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <select
                  value={question.type}
                  onChange={(e) =>
                    changeQuestionType(sectionIndex, questionIndex, e.target.value as QuestionType)
                  }
                  className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)]"
                >
                  {QUESTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveQuestion(sectionIndex, questionIndex, -1)}
                    disabled={questionIndex === 0}
                    className="ui-btn ui-btn-ghost h-8 w-8 p-0 disabled:opacity-30"
                    aria-label="Monter la question"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveQuestion(sectionIndex, questionIndex, 1)}
                    disabled={questionIndex === section.questions.length - 1}
                    className="ui-btn ui-btn-ghost h-8 w-8 p-0 disabled:opacity-30"
                    aria-label="Descendre la question"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateQuestion(sectionIndex, questionIndex)}
                    className="ui-btn ui-btn-ghost h-8 w-8 p-0"
                    aria-label="Dupliquer la question"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeQuestion(sectionIndex, questionIndex)}
                    className="ui-btn ui-btn-ghost h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
                    aria-label="Supprimer la question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <label className={labelClass}>
                Intitulé de la question
                <input
                  value={question.label}
                  onChange={(e) =>
                    mutateQuestion(sectionIndex, questionIndex, { label: e.target.value })
                  }
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                Précision (facultatif)
                <input
                  value={question.help ?? ""}
                  onChange={(e) =>
                    mutateQuestion(sectionIndex, questionIndex, {
                      help: e.target.value || undefined,
                    })
                  }
                  className={inputClass}
                />
              </label>

              {(question.type === "single" || question.type === "multiple") && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[color:var(--foreground)]/55">
                    Options de réponse
                  </span>
                  {(question.options ?? []).map((opt, optIndex) => (
                    <div key={optIndex} className="flex items-center gap-2">
                      <input
                        value={opt}
                        onChange={(e) =>
                          setOption(sectionIndex, questionIndex, optIndex, e.target.value)
                        }
                        className={inputClass}
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(sectionIndex, questionIndex, optIndex)}
                        className="ui-btn ui-btn-ghost h-9 w-9 shrink-0 p-0 text-rose-600 hover:bg-rose-50"
                        aria-label="Supprimer l'option"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOption(sectionIndex, questionIndex)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter une option
                  </button>
                </div>
              )}

              {(question.type === "rating" || question.type === "nps") && (
                <div className="flex flex-wrap gap-3">
                  <label className={labelClass}>
                    Minimum
                    <input
                      type="number"
                      value={question.scale?.min ?? 0}
                      onChange={(e) =>
                        mutateQuestion(sectionIndex, questionIndex, {
                          scale: {
                            min: Number(e.target.value),
                            max: question.scale?.max ?? 5,
                          },
                        })
                      }
                      className={`${inputClass} w-24`}
                    />
                  </label>
                  <label className={labelClass}>
                    Maximum
                    <input
                      type="number"
                      value={question.scale?.max ?? 5}
                      onChange={(e) =>
                        mutateQuestion(sectionIndex, questionIndex, {
                          scale: {
                            min: question.scale?.min ?? 0,
                            max: Number(e.target.value),
                          },
                        })
                      }
                      className={`${inputClass} w-24`}
                    />
                  </label>
                </div>
              )}

              {(question.type === "open" || question.type === "text") && (
                <label className={labelClass}>
                  Placeholder (facultatif)
                  <input
                    value={question.placeholder ?? ""}
                    onChange={(e) =>
                      mutateQuestion(sectionIndex, questionIndex, {
                        placeholder: e.target.value || undefined,
                      })
                    }
                    className={inputClass}
                  />
                </label>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-3">
                <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={Boolean(question.required)}
                    onChange={(e) =>
                      mutateQuestion(sectionIndex, questionIndex, { required: e.target.checked })
                    }
                    className="ui-focus-ring h-4 w-4 rounded border-[var(--line)]"
                  />
                  Obligatoire
                </label>

                {prestationOptions.length > 0 && question.id !== "q4" ? (
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--foreground)]/55">
                    Afficher si prestation
                    <select
                      value={question.showIfPrestation ?? ""}
                      onChange={(e) =>
                        mutateQuestion(sectionIndex, questionIndex, {
                          showIfPrestation: e.target.value || undefined,
                        })
                      }
                      className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 text-xs text-[var(--foreground)]"
                    >
                      <option value="">Toujours</option>
                      {prestationOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => addQuestion(sectionIndex)}
            className="ui-btn ui-btn-secondary w-full justify-center gap-2 text-xs"
          >
            <Plus className="h-4 w-4" />
            Ajouter une question
          </button>
        </section>
      ))}

      <button
        type="button"
        onClick={addSection}
        className="ui-btn ui-btn-secondary w-full justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Ajouter un écran
      </button>
    </div>
  );
}
