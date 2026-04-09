"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { AiAnswerContent } from "../lib/formatAiAnswer";

type QuickAiAssistantProps = {
  context: string;
};

export default function QuickAiAssistant({ context }: QuickAiAssistantProps) {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => prompt.trim().length > 0 && !busy, [prompt, busy]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setAnswer("");
    try {
      const response = await fetch("/api/ai/free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), context }),
      });
      const data = (await response.json()) as { content?: string; error?: string };
      if (!response.ok) {
        setError(data.error ?? "IA indisponible.");
        return;
      }
      setAnswer(data.content ?? "");
    } catch {
      setError("Impossible de joindre le service IA.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="ui-surface rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[var(--accent)]" />
        <p className="text-sm font-semibold text-[var(--foreground)]">Assistant IA cloud (free-only)</p>
        </div>
        <span className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--foreground)]/70">
          Sans carte bancaire
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <textarea
          rows={3}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Ex: Résume mes priorités de la semaine et propose 3 actions."
          className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[color:var(--foreground)]/45 focus:outline-none"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
            className="ui-transition inline-flex items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#fffdf9] hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Demander à l&apos;IA
          </button>
          <p className="text-xs text-[color:var(--foreground)]/55">
            Aucun fallback payant. Si quota gratuit atteint, il faut attendre.
          </p>
        </div>
        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {error}
          </div>
        )}
        {answer && <AiAnswerContent text={answer} />}
      </div>
    </section>
  );
}
