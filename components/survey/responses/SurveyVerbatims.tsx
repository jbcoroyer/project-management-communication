"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageSquareQuote, Search } from "lucide-react";
import type { Verbatim } from "../../../lib/survey/surveyAnalytics";

function formatDate(iso: string): string {
  try {
    return format(new Date(iso), "d MMM yyyy", { locale: fr });
  } catch {
    return "";
  }
}

export default function SurveyVerbatims({ verbatims }: { verbatims: Verbatim[] }) {
  const [query, setQuery] = useState("");
  const [questionFilter, setQuestionFilter] = useState<string>("all");

  const questionOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of verbatims) map.set(v.questionId, v.questionLabel);
    return Array.from(map.entries());
  }, [verbatims]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return verbatims.filter((v) => {
      if (questionFilter !== "all" && v.questionId !== questionFilter) return false;
      if (!q) return true;
      return (
        v.text.toLowerCase().includes(q) ||
        (v.respondentName ?? "").toLowerCase().includes(q) ||
        (v.entity ?? "").toLowerCase().includes(q)
      );
    });
  }, [verbatims, query, questionFilter]);

  return (
    <section className="ui-surface rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
          <MessageSquareQuote className="h-4 w-4 text-[color:var(--foreground)]/50" />
          Verbatims ({filtered.length})
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={questionFilter}
            onChange={(e) => setQuestionFilter(e.target.value)}
            className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs text-[var(--foreground)]"
          >
            <option value="all">Toutes les questions ouvertes</option>
            {questionOptions.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
            <Search className="h-3.5 w-3.5 text-[color:var(--foreground)]/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              className="ui-focus-ring w-40 bg-transparent text-xs text-[var(--foreground)] placeholder:text-[color:var(--foreground)]/40"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-[color:var(--foreground)]/45">
          Aucun verbatim pour ces critères.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((v, i) => (
            <li
              key={`${v.responseId}-${v.questionId}-${i}`}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-4"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--foreground)]/45">
                {v.questionLabel}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--foreground)]">
                « {v.text} »
              </p>
              <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[color:var(--foreground)]/50">
                {v.respondentName ? <span className="font-semibold">{v.respondentName}</span> : null}
                {v.entity ? <span>{v.entity}</span> : null}
                {v.service ? <span>{v.service}</span> : null}
                {v.createdAt ? <span>{formatDate(v.createdAt)}</span> : null}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
