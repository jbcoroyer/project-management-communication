"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import type { Question, SurveyAnswers } from "../../lib/survey/surveyTypes";
import RatingScale from "./RatingScale";

type QuestionFieldProps = {
  question: Question;
  value: SurveyAnswers[string];
  onChange: (value: SurveyAnswers[string]) => void;
  /** Options dynamiques (ex. entités depuis useReferenceData) qui remplacent celles de la config. */
  optionsOverride?: readonly string[];
};

export default function QuestionField({
  question,
  value,
  onChange,
  optionsOverride,
}: QuestionFieldProps) {
  const options = optionsOverride ?? question.options ?? [];

  return (
    <fieldset className="space-y-3">
      <legend className="text-base font-semibold text-[var(--foreground)]">
        {question.label}
        {question.required ? <span className="ml-1 text-[var(--accent)]">*</span> : null}
      </legend>
      {question.help ? (
        <p className="-mt-1 text-[13px] leading-relaxed text-[color:var(--foreground)]/55">
          {question.help}
        </p>
      ) : null}

      {question.type === "single" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((opt) => {
            const active = value === opt;
            return (
              <motion.button
                key={opt}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => onChange(opt)}
                aria-pressed={active}
                className={[
                  "ui-focus-ring ui-transition flex items-center gap-2.5 rounded-xl border px-4 py-3 text-left text-sm font-medium",
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--foreground)]"
                    : "border-[var(--line)] bg-[var(--surface)] text-[color:var(--foreground)]/75 hover:border-[var(--line-strong)]",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                    active ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--line-strong)]",
                  ].join(" ")}
                >
                  {active ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                </span>
                {opt}
              </motion.button>
            );
          })}
        </div>
      ) : null}

      {question.type === "multiple" ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((opt) => {
            const selected = Array.isArray(value) && value.includes(opt);
            return (
              <motion.button
                key={opt}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const current = Array.isArray(value) ? value : [];
                  onChange(
                    selected ? current.filter((v) => v !== opt) : [...current, opt],
                  );
                }}
                aria-pressed={selected}
                className={[
                  "ui-focus-ring ui-transition flex items-center gap-2.5 rounded-xl border px-4 py-3 text-left text-sm font-medium",
                  selected
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--foreground)]"
                    : "border-[var(--line)] bg-[var(--surface)] text-[color:var(--foreground)]/75 hover:border-[var(--line-strong)]",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-md border",
                    selected ? "border-[var(--accent)] bg-[var(--accent)]" : "border-[var(--line-strong)]",
                  ].join(" ")}
                >
                  {selected ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null}
                </span>
                {opt}
              </motion.button>
            );
          })}
        </div>
      ) : null}

      {question.type === "rating" || question.type === "nps" ? (
        <RatingScale
          min={question.scale?.min ?? 1}
          max={question.scale?.max ?? 5}
          value={typeof value === "number" ? value : undefined}
          onChange={(v) => onChange(v)}
          labels={question.scaleLabels}
          variant={question.type === "nps" ? "numbers" : "auto"}
        />
      ) : null}

      {question.type === "open" ? (
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          rows={4}
          maxLength={4000}
          className="ui-focus-ring w-full resize-y rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[color:var(--foreground)]/40"
        />
      ) : null}

      {question.type === "text" ? (
        <input
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={question.placeholder}
          maxLength={200}
          className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[color:var(--foreground)]/40"
        />
      ) : null}
    </fieldset>
  );
}
