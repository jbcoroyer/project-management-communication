"use client";

import { Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type RatingScaleProps = {
  min: number;
  max: number;
  value: number | undefined;
  onChange: (value: number) => void;
  labels?: { min: string; max: string };
  /** "nps" force l'affichage en pastilles numérotées colorées. */
  variant?: "auto" | "stars" | "numbers";
};

/** Emoji réactif selon la note (ratio 0→1). */
function reactionFor(value: number, min: number, max: number): { emoji: string; text: string } {
  const ratio = (value - min) / Math.max(1, max - min);
  if (ratio < 0.2) return { emoji: "😞", text: "Aïe, on note ça." };
  if (ratio < 0.4) return { emoji: "😕", text: "On peut mieux faire." };
  if (ratio < 0.6) return { emoji: "😐", text: "Correct, sans plus." };
  if (ratio < 0.8) return { emoji: "🙂", text: "Plutôt bien !" };
  return { emoji: "🤩", text: "Au top, merci !" };
}

/** Couleur d'une pastille NPS/numérique selon la position dans l'échelle. */
function pillColor(index: number, count: number, active: boolean): string {
  if (!active) {
    return "border-[var(--line)] bg-[var(--surface)] text-[color:var(--foreground)]/60 hover:border-[var(--line-strong)]";
  }
  const ratio = index / Math.max(1, count - 1);
  if (ratio < 0.4) return "border-transparent bg-rose-500 text-white shadow-md";
  if (ratio < 0.7) return "border-transparent bg-amber-500 text-white shadow-md";
  return "border-transparent bg-emerald-500 text-white shadow-md";
}

export default function RatingScale({
  min,
  max,
  value,
  onChange,
  labels,
  variant = "auto",
}: RatingScaleProps) {
  const useStars = variant === "stars" || (variant === "auto" && max - min + 1 <= 5);
  const values: number[] = [];
  for (let v = min; v <= max; v += 1) values.push(v);

  const reaction = value != null ? reactionFor(value, min, max) : null;

  return (
    <div className="space-y-3">
      {useStars ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {values.map((v) => {
            const filled = value != null && v <= value;
            return (
              <motion.button
                key={v}
                type="button"
                whileTap={{ scale: 0.85 }}
                whileHover={{ scale: 1.12 }}
                onClick={() => onChange(v)}
                aria-label={`Note ${v} sur ${max}`}
                aria-pressed={value === v}
                className="ui-focus-ring rounded-full p-1"
              >
                <Star
                  className={
                    filled
                      ? "h-9 w-9 fill-amber-400 text-amber-400"
                      : "h-9 w-9 text-[color:var(--foreground)]/25"
                  }
                  strokeWidth={1.75}
                />
              </motion.button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v, i) => (
            <motion.button
              key={v}
              type="button"
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.06 }}
              onClick={() => onChange(v)}
              aria-label={`Note ${v}`}
              aria-pressed={value === v}
              className={[
                "ui-focus-ring flex h-11 w-11 items-center justify-center rounded-xl border text-sm font-bold tabular-nums transition-colors",
                pillColor(i, values.length, value === v),
              ].join(" ")}
            >
              {v}
            </motion.button>
          ))}
        </div>
      )}

      {labels ? (
        <div className="flex justify-between text-[11px] font-medium text-[color:var(--foreground)]/45">
          <span>{labels.min}</span>
          <span>{labels.max}</span>
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {reaction ? (
          <motion.div
            key={value}
            initial={{ opacity: 0, y: 6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-soft)] px-3 py-1.5 text-sm font-semibold text-[var(--foreground)]"
          >
            <span className="text-lg" aria-hidden>
              {reaction.emoji}
            </span>
            {reaction.text}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
