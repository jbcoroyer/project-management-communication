"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Inbox, Trash2, User } from "lucide-react";
import type { SurveyDefinition, SurveyResponse } from "../../../lib/survey/surveyTypes";

function formatDateTime(iso: string): string {
  try {
    return format(new Date(iso), "d MMM yyyy 'à' HH:mm", { locale: fr });
  } catch {
    return iso;
  }
}

function formatValue(value: string | number | string[] | undefined): string {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "—";
  return String(value);
}

type SurveyResponseListProps = {
  definition: SurveyDefinition;
  responses: SurveyResponse[];
  onDelete: (responseId: string) => void;
  deletingId: string | null;
};

export default function SurveyResponseList({
  definition,
  responses,
  onDelete,
  deletingId,
}: SurveyResponseListProps) {
  if (responses.length === 0) {
    return (
      <div className="ui-surface flex flex-col items-center gap-2 rounded-2xl p-12 text-center">
        <Inbox className="h-8 w-8 text-[color:var(--foreground)]/35" />
        <p className="text-sm text-[color:var(--foreground)]/55">
          Aucune réponse à afficher pour ces filtres.
        </p>
      </div>
    );
  }

  const questions = definition.questions.filter((q) => q.type !== "text");

  return (
    <div className="space-y-4">
      {responses.map((response, index) => (
        <article key={response.id} className="ui-surface rounded-2xl p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">
                Réponse #{responses.length - index}
              </p>
              <p className="mt-0.5 text-xs text-[color:var(--foreground)]/50">
                {formatDateTime(response.createdAt)}
              </p>
              {response.respondentName ? (
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)]">
                  <User className="h-3 w-3" />
                  {response.respondentName}
                </p>
              ) : (
                <p className="mt-1 text-xs italic text-[color:var(--foreground)]/40">Anonyme</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDelete(response.id)}
              disabled={deletingId === response.id}
              className="ui-transition inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {deletingId === response.id ? "Suppression…" : "Supprimer"}
            </button>
          </div>

          <dl className="grid gap-3 sm:grid-cols-2">
            {questions.map((q) => {
              const value = response.answers[q.id];
              return (
                <div key={q.id} className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--foreground)]/45">
                    {q.label}
                  </dt>
                  <dd className="mt-0.5 text-sm text-[var(--foreground)]">{formatValue(value)}</dd>
                </div>
              );
            })}
          </dl>
        </article>
      ))}
    </div>
  );
}
