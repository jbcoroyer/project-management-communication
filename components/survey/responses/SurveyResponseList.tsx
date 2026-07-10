"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  ChevronDown,
  CircleDot,
  Inbox,
  ListChecks,
  MessageSquareQuote,
  Sparkles,
  Star,
  Tag,
  Trash2,
  TrendingUp,
  User,
} from "lucide-react";
import type { Question, SurveyDefinition, SurveyResponse } from "../../../lib/survey/surveyTypes";

function formatDateTime(iso: string): string {
  try {
    return format(new Date(iso), "d MMM yyyy 'à' HH:mm", { locale: fr });
  } catch {
    return iso;
  }
}

function formatRelative(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: fr });
  } catch {
    return "";
  }
}

function getInitials(name: string | null): string {
  if (!name?.trim()) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function reactionFor(value: number, min: number, max: number): { emoji: string; text: string } {
  const ratio = (value - min) / Math.max(1, max - min);
  if (ratio < 0.2) return { emoji: "😞", text: "Insatisfait" };
  if (ratio < 0.4) return { emoji: "😕", text: "Peu satisfait" };
  if (ratio < 0.6) return { emoji: "😐", text: "Correct" };
  if (ratio < 0.8) return { emoji: "🙂", text: "Satisfait" };
  return { emoji: "🤩", text: "Très satisfait" };
}

function npsCategory(score: number): { label: string; className: string } {
  if (score <= 6) return { label: "Détracteur", className: "bg-rose-100 text-rose-700 border-rose-200" };
  if (score <= 8) return { label: "Passif", className: "bg-amber-100 text-amber-800 border-amber-200" };
  return { label: "Promoteur", className: "bg-emerald-100 text-emerald-800 border-emerald-200" };
}

function pillColor(index: number, count: number): string {
  const ratio = index / Math.max(1, count - 1);
  if (ratio < 0.4) return "bg-rose-500";
  if (ratio < 0.7) return "bg-amber-500";
  return "bg-emerald-500";
}

const CARD_ACCENTS = [
  "from-[var(--accent)]/15 via-transparent to-transparent",
  "from-sky-500/12 via-transparent to-transparent",
  "from-violet-500/12 via-transparent to-transparent",
  "from-emerald-500/12 via-transparent to-transparent",
  "from-amber-500/12 via-transparent to-transparent",
] as const;

const QUESTION_ICONS = {
  rating: Star,
  nps: TrendingUp,
  single: CircleDot,
  multiple: ListChecks,
  open: MessageSquareQuote,
} as const;

function RatingDisplay({
  value,
  min,
  max,
}: {
  value: number;
  min: number;
  max: number;
}) {
  const useStars = max - min + 1 <= 5;
  const reaction = reactionFor(value, min, max);

  if (useStars) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-0.5">
          {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((v) => (
            <Star
              key={v}
              className={
                v <= value
                  ? "h-6 w-6 fill-amber-400 text-amber-400"
                  : "h-6 w-6 text-[color:var(--foreground)]/15"
              }
              strokeWidth={1.75}
            />
          ))}
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-bold tabular-nums text-amber-800">
          {value}/{max}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--foreground)]">
          <span aria-hidden>{reaction.emoji}</span>
          {reaction.text}
        </span>
      </div>
    );
  }

  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-1">
        {values.map((v, i) => (
          <span
            key={v}
            className={[
              "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold tabular-nums",
              v === value
                ? `${pillColor(i, values.length)} text-white shadow-sm`
                : "bg-[var(--surface-soft)] text-[color:var(--foreground)]/30",
            ].join(" ")}
          >
            {v}
          </span>
        ))}
      </div>
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--foreground)]">
        <span aria-hidden>{reaction.emoji}</span>
        {reaction.text}
      </span>
    </div>
  );
}

function NpsDisplay({ value }: { value: number }) {
  const cat = npsCategory(value);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span
        className={[
          "flex h-12 w-12 items-center justify-center rounded-2xl border text-xl font-bold tabular-nums shadow-sm",
          cat.className,
        ].join(" ")}
      >
        {value}
      </span>
      <span
        className={[
          "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
          cat.className,
        ].join(" ")}
      >
        {cat.label}
      </span>
      <span className="text-2xl" aria-hidden>
        {value >= 9 ? "🤩" : value >= 7 ? "🙂" : "😕"}
      </span>
    </div>
  );
}

function ChoiceChips({ values, multiple }: { values: string[]; multiple?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((v) => (
        <span
          key={v}
          className={[
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium",
            multiple
              ? "border-violet-200 bg-violet-50 text-violet-800"
              : "border-[var(--accent)]/30 bg-[var(--accent-soft)] text-[var(--foreground)]",
          ].join(" ")}
        >
          {multiple ? (
            <ListChecks className="h-3.5 w-3.5 shrink-0 opacity-60" />
          ) : (
            <CircleDot className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
          )}
          {v}
        </span>
      ))}
    </div>
  );
}

function OpenAnswer({ text }: { text: string }) {
  return (
    <blockquote className="relative rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3">
      <MessageSquareQuote className="absolute -left-1 -top-1 h-5 w-5 text-[var(--accent)]/40" />
      <p className="text-sm leading-relaxed text-[var(--foreground)]">« {text} »</p>
    </blockquote>
  );
}

function AnswerBlock({ question, value }: { question: Question; value: SurveyResponse["answers"][string] }) {
  const Icon = QUESTION_ICONS[question.type as keyof typeof QUESTION_ICONS] ?? CircleDot;

  const typeColors: Record<string, string> = {
    rating: "text-amber-600 bg-amber-50",
    nps: "text-emerald-600 bg-emerald-50",
    single: "text-sky-600 bg-sky-50",
    multiple: "text-violet-600 bg-violet-50",
    open: "text-rose-600 bg-rose-50",
  };
  const iconClass = typeColors[question.type] ?? "text-[color:var(--foreground)]/50 bg-[var(--surface-soft)]";

  let content: React.ReactNode;
  if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) {
    content = <span className="text-sm italic text-[color:var(--foreground)]/35">Pas de réponse</span>;
  } else if (question.type === "rating" && typeof value === "number") {
    const min = question.scale?.min ?? 1;
    const max = question.scale?.max ?? 5;
    content = <RatingDisplay value={value} min={min} max={max} />;
  } else if (question.type === "nps" && typeof value === "number") {
    content = <NpsDisplay value={value} />;
  } else if (question.type === "single" && typeof value === "string") {
    content = <ChoiceChips values={[value]} />;
  } else if (question.type === "multiple" && Array.isArray(value)) {
    content = <ChoiceChips values={value} multiple />;
  } else if (question.type === "open" && typeof value === "string") {
    content = <OpenAnswer text={value} />;
  } else {
    content = (
      <span className="text-sm text-[var(--foreground)]">
        {Array.isArray(value) ? value.join(", ") : String(value)}
      </span>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3.5">
      <div className="mb-2 flex items-start gap-2">
        <span
          className={[
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            iconClass,
          ].join(" ")}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-[var(--foreground)]">
          {question.label}
        </p>
      </div>
      <div className="pl-9">{content}</div>
    </div>
  );
}

function ResponseCard({
  response,
  number,
  questions,
  accentIndex,
  defaultExpanded,
  onDelete,
  deleting,
}: {
  response: SurveyResponse;
  number: number;
  questions: readonly Question[];
  accentIndex: number;
  defaultExpanded: boolean;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const accent = CARD_ACCENTS[accentIndex % CARD_ACCENTS.length];
  const initials = getInitials(response.respondentName);
  const hasMeta = response.entity || response.service || response.prestations.length > 0;

  const highlight =
    response.npsScore != null
      ? npsCategory(response.npsScore)
      : response.satisfaction != null
        ? reactionFor(response.satisfaction, 1, 5)
        : null;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: accentIndex * 0.04 }}
      className="ui-surface overflow-hidden rounded-2xl"
    >
      <div className={`bg-gradient-to-r ${accent} px-5 pt-4`}>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="ui-focus-ring ui-transition flex w-full items-start gap-3 rounded-xl pb-4 text-left"
          aria-expanded={expanded}
        >
          <div
            className={[
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold",
              response.respondentName
                ? "bg-[var(--accent)] text-white shadow-sm"
                : "bg-[var(--surface-soft)] text-[color:var(--foreground)]/40",
            ].join(" ")}
          >
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[color:var(--foreground)]/50 shadow-sm">
                <Sparkles className="h-3 w-3" />
                #{number}
              </span>
              {response.respondentName ? (
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {response.respondentName}
                </span>
              ) : (
                <span className="text-sm italic text-[color:var(--foreground)]/45">Anonyme</span>
              )}
              {response.npsScore != null ? (
                <span
                  className={[
                    "rounded-full border px-2 py-0.5 text-[10px] font-bold tabular-nums",
                    npsCategory(response.npsScore).className,
                  ].join(" ")}
                >
                  NPS {response.npsScore}
                </span>
              ) : null}
              {response.satisfaction != null ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {response.satisfaction}/5
                </span>
              ) : null}
            </div>

            <p className="mt-0.5 text-xs text-[color:var(--foreground)]/50">
              {formatDateTime(response.createdAt)}
              <span className="mx-1.5 text-[color:var(--foreground)]/25">·</span>
              {formatRelative(response.createdAt)}
            </p>

            {!expanded && hasMeta ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {response.entity ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[11px] text-[color:var(--foreground)]/60">
                    <Building2 className="h-3 w-3" />
                    {response.entity}
                  </span>
                ) : null}
                {response.service ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[11px] text-[color:var(--foreground)]/60">
                    <Tag className="h-3 w-3" />
                    {response.service}
                  </span>
                ) : null}
              </div>
            ) : null}

            {!expanded && highlight && "emoji" in highlight ? (
              <p className="mt-1.5 text-xs text-[color:var(--foreground)]/55">
                <span aria-hidden>{highlight.emoji}</span> {highlight.text}
              </p>
            ) : null}
          </div>

          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="mt-1 shrink-0 text-[color:var(--foreground)]/35"
          >
            <ChevronDown className="h-5 w-5" />
          </motion.span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--line)] px-5 pb-5 pt-4">
              {hasMeta ? (
                <div className="mb-4 flex flex-wrap gap-2">
                  {response.entity ? (
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-800">
                      <Building2 className="h-3.5 w-3.5" />
                      {response.entity}
                    </span>
                  ) : null}
                  {response.service ? (
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-800">
                      <Tag className="h-3.5 w-3.5" />
                      {response.service}
                    </span>
                  ) : null}
                  {response.prestations.map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-medium text-[color:var(--foreground)]/70"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                {questions.map((q) => (
                  <div
                    key={q.id}
                    className={q.type === "open" ? "sm:col-span-2" : undefined}
                  >
                    <AnswerBlock question={q} value={response.answers[q.id]} />
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-end border-t border-[var(--line)] pt-3">
                <button
                  type="button"
                  onClick={() => onDelete(response.id)}
                  disabled={deleting}
                  className="ui-transition inline-flex items-center gap-1.5 rounded-lg border border-transparent px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deleting ? "Suppression…" : "Supprimer cette réponse"}
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
  );
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
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="ui-surface flex flex-col items-center gap-3 rounded-2xl p-12 text-center"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-soft)]">
          <Inbox className="h-7 w-7 text-[color:var(--foreground)]/30" />
        </div>
        <p className="text-sm font-medium text-[color:var(--foreground)]/55">
          Aucune réponse à afficher pour ces filtres.
        </p>
        <p className="text-xs text-[color:var(--foreground)]/35">
          Essayez d&apos;élargir la période ou de retirer des filtres.
        </p>
      </motion.div>
    );
  }

  const questions = definition.questions.filter((q) => q.type !== "text");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-[color:var(--foreground)]/45">
          <span className="font-semibold text-[var(--foreground)]">{responses.length}</span>{" "}
          réponse{responses.length > 1 ? "s" : ""} — cliquez sur une carte pour voir le détail
        </p>
      </div>

      {responses.map((response, index) => (
        <ResponseCard
          key={response.id}
          response={response}
          number={responses.length - index}
          questions={questions}
          accentIndex={index}
          defaultExpanded={index === 0}
          onDelete={onDelete}
          deleting={deletingId === response.id}
        />
      ))}
    </div>
  );
}
