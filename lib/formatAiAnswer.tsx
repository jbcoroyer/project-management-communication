"use client";

import { Fragment, type ReactNode } from "react";

type AiAnswerContentProps = {
  text: string;
  onTaskClick?: (taskId: string) => void;
  resolveTaskId?: (quotedTitle: string) => string | null;
};

/**
 * Affiche la réponse IA ; les titres de tâches « … » deviennent cliquables si résolus.
 */
export function AiAnswerContent({
  text,
  onTaskClick,
  resolveTaskId,
}: AiAnswerContentProps) {
  const segments: ReactNode[] = [];
  const re = /«([^»]+)»/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      segments.push(
        <span key={`t-${key++}`} className="whitespace-pre-wrap">
          {text.slice(last, m.index)}
        </span>,
      );
    }
    const title = m[1].trim();
    const id = resolveTaskId?.(title) ?? null;
    if (id && onTaskClick) {
      segments.push(
        <button
          key={`l-${key++}`}
          type="button"
          onClick={() => onTaskClick(id)}
          className="ui-transition mx-0.5 inline rounded-md border border-[var(--accent)]/35 bg-[var(--accent)]/10 px-1 py-0.5 text-left text-sm font-medium text-[var(--accent-strong)] underline decoration-[var(--accent)]/40 underline-offset-2 hover:bg-[var(--accent)]/18"
        >
          «{title}»
        </button>,
      );
    } else {
      segments.push(
        <span key={`q-${key++}`} className="font-medium text-[var(--foreground)]">
          «{title}»
        </span>,
      );
    }
    last = m.index + m[0].length;
  }

  if (last < text.length) {
    segments.push(
      <span key={`t-${key++}`} className="whitespace-pre-wrap">
        {text.slice(last)}
      </span>,
    );
  }

  return (
    <div className="max-h-[min(40vh,280px)] overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-3 text-sm leading-relaxed text-[var(--foreground)]">
      {segments.length > 0 ? (
        <Fragment>{segments}</Fragment>
      ) : (
        <span className="whitespace-pre-wrap">{text}</span>
      )}
    </div>
  );
}
