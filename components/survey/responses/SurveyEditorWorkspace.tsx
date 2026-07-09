"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import { saveSurveyDefinition } from "../../../app/actions/survey";
import { getSurveyRegistryEntry } from "../../../lib/survey/surveyRegistry";
import type { Question, SurveyDefinition } from "../../../lib/survey/surveyTypes";
import { toastError, toastSuccess } from "../../../lib/toast";

const QUESTION_TYPE_LABELS: Record<Question["type"], string> = {
  single: "Choix unique",
  multiple: "Choix multiple",
  rating: "Note",
  nps: "NPS",
  open: "Texte libre",
  text: "Champ court",
};

type SurveyEditorWorkspaceProps = {
  surveyId: string;
  initialDefinition: SurveyDefinition;
};

export default function SurveyEditorWorkspace({
  surveyId,
  initialDefinition,
}: SurveyEditorWorkspaceProps) {
  const entry = getSurveyRegistryEntry(surveyId);
  const [definition, setDefinition] = useState<SurveyDefinition>(() =>
    structuredClone(initialDefinition),
  );
  const [saving, setSaving] = useState(false);

  const updateQuestion = (id: string, patch: Partial<Question>) => {
    setDefinition((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        questions: prev.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
      };
    });
  };

  const handleSave = async () => {
    if (!definition) return;
    setSaving(true);
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

  const sections = Array.from(new Set(definition.questions.map((q) => q.section))).sort(
    (a, b) => a - b,
  );

  return (
    <div className="space-y-5">
      <header className="ui-surface flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
        <div>
        <Link
          href={`/questionnaire/reponses/${surveyId}`}
          className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--foreground)]/50 hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour au questionnaire
        </Link>
          <h1 className="ui-display text-2xl text-[var(--foreground)]">Éditer le questionnaire</h1>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/60">{entry.title}</p>
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
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Introduction</h2>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/55">
          Titre d&apos;accueil
          <input
            value={definition.intro.title}
            onChange={(e) =>
              setDefinition((prev) =>
                prev ? { ...prev, intro: { ...prev.intro, title: e.target.value } } : prev,
              )
            }
            className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/55">
          Sous-titre
          <textarea
            value={definition.intro.subtitle}
            onChange={(e) =>
              setDefinition((prev) =>
                prev ? { ...prev, intro: { ...prev.intro, subtitle: e.target.value } } : prev,
              )
            }
            rows={2}
            className="ui-focus-ring resize-y rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
          />
        </label>
      </section>

      {sections.map((section) => (
        <section key={section} className="ui-surface space-y-4 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Section {section}</h2>
          {definition.questions
            .filter((q) => q.section === section)
            .map((question) => (
              <div
                key={question.id}
                className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-[var(--surface)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[color:var(--foreground)]/45">
                    {question.id}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--foreground)]/45">
                    {QUESTION_TYPE_LABELS[question.type]}
                  </span>
                  {question.showIfPrestation ? (
                    <span className="text-[10px] text-[color:var(--foreground)]/45">
                      Si « {question.showIfPrestation} »
                    </span>
                  ) : null}
                </div>

                <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/55">
                  Intitulé
                  <input
                    value={question.label}
                    onChange={(e) => updateQuestion(question.id, { label: e.target.value })}
                    className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/55">
                  Précision (facultatif)
                  <input
                    value={question.help ?? ""}
                    onChange={(e) => updateQuestion(question.id, { help: e.target.value || undefined })}
                    className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
                  />
                </label>

                {(question.type === "open" || question.type === "text") && (
                  <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/55">
                    Placeholder
                    <input
                      value={question.placeholder ?? ""}
                      onChange={(e) =>
                        updateQuestion(question.id, { placeholder: e.target.value || undefined })
                      }
                      className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
                    />
                  </label>
                )}

                {(question.type === "single" || question.type === "multiple") && (
                  <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/55">
                    Options (une par ligne)
                    <textarea
                      value={(question.options ?? []).join("\n")}
                      onChange={(e) =>
                        updateQuestion(question.id, {
                          options: e.target.value
                            .split("\n")
                            .map((line) => line.trim())
                            .filter(Boolean),
                        })
                      }
                      rows={4}
                      className="ui-focus-ring resize-y rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 font-mono text-sm font-normal text-[var(--foreground)]"
                    />
                  </label>
                )}

                <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={Boolean(question.required)}
                    onChange={(e) => updateQuestion(question.id, { required: e.target.checked })}
                    className="ui-focus-ring h-4 w-4 rounded border-[var(--line)]"
                  />
                  Question obligatoire
                </label>
              </div>
            ))}
        </section>
      ))}
    </div>
  );
}
