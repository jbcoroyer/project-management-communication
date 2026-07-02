"use client";

import { useState } from "react";
import { Check, Copy, Database, HardDrive, Loader2, Sparkles, Wand2 } from "lucide-react";
import { repurposeContent, type AiBackend } from "../../../lib/v2/aiClient";
import { toastError, toastSuccess } from "../../../lib/toast";

const NETWORK_OPTIONS = ["LinkedIn", "Instagram", "Facebook", "X"];

export default function RepurposePanel({
  initialSource = "",
  onUseVariant,
}: {
  initialSource?: string;
  onUseVariant?: (network: string, text: string) => void;
}) {
  const [source, setSource] = useState(initialSource);
  const [selected, setSelected] = useState<string[]>(["LinkedIn", "Instagram", "Facebook"]);
  const [variants, setVariants] = useState<Record<string, string>>({});
  const [backend, setBackend] = useState<AiBackend | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = (network: string) => {
    setSelected((prev) =>
      prev.includes(network) ? prev.filter((n) => n !== network) : [...prev, network],
    );
  };

  const generate = async () => {
    if (!source.trim() || selected.length === 0 || busy) return;
    setBusy(true);
    try {
      const result = await repurposeContent(source.trim(), selected);
      setVariants(result.variants);
      setBackend(result.backend);
    } catch {
      toastError("Génération impossible. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toastSuccess("Copié");
    } catch {
      toastError("Copie impossible");
    }
  };

  return (
    <div className="ui-surface rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <Wand2 className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">Repurposing IA</h2>
            <p className="text-xs text-[color:var(--foreground)]/55">
              Un contenu source → une variante adaptée par réseau.
            </p>
          </div>
        </div>
        {backend ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--foreground)]/60">
            {backend === "openrouter" ? <Database className="h-3.5 w-3.5" /> : <HardDrive className="h-3.5 w-3.5" />}
            {backend === "openrouter" ? "IA OpenRouter" : "Génération locale"}
          </span>
        ) : null}
      </div>

      <textarea
        value={source}
        onChange={(e) => setSource(e.target.value)}
        rows={4}
        placeholder="Collez un article, un communiqué ou une idée de post…"
        className="ui-focus-ring mt-4 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {NETWORK_OPTIONS.map((network) => {
          const active = selected.includes(network);
          return (
            <button
              key={network}
              type="button"
              onClick={() => toggle(network)}
              className={[
                "ui-transition rounded-full border px-3 py-1 text-xs font-semibold",
                active
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--line)] text-[color:var(--foreground)]/60 hover:bg-[var(--surface-soft)]",
              ].join(" ")}
            >
              {active ? <Check className="mr-1 inline h-3 w-3" /> : null}
              {network}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => void generate()}
          disabled={busy || !source.trim() || selected.length === 0}
          className="ui-transition ml-auto inline-flex items-center gap-2 rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-strong)] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Générer
        </button>
      </div>

      {Object.keys(variants).length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Object.entries(variants).map(([network, text]) => (
            <div key={network} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--foreground)]">{network}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => void copy(text)}
                    className="ui-transition rounded-md border border-[var(--line)] p-1 text-[color:var(--foreground)]/55 hover:text-[var(--foreground)]"
                    aria-label="Copier"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  {onUseVariant ? (
                    <button
                      type="button"
                      onClick={() => onUseVariant(network, text)}
                      className="ui-transition rounded-md border border-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                    >
                      Utiliser
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-[color:var(--foreground)]/75">{text}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
