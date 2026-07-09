"use client";

import { useMemo, useState } from "react";
import { CalendarRange, Copy, Loader2, Sparkles } from "lucide-react";
import EventsSectionNav from "../../events/EventsSectionNav";
import { useEvents } from "../../../lib/useEvents";
import type { EventRow } from "../../../lib/eventTypes";
import { buildRetexDraft, useRetexInputs } from "../../../lib/v2/retex";
import { summarize } from "../../../lib/v2/aiClient";
import { toastError, toastSuccess } from "../../../lib/toast";

export default function V2EventsRetexPage() {
  const { events, loading } = useEvents();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const selected = useMemo<EventRow | null>(
    () => events.find((e) => e.id === selectedId) ?? events[0] ?? null,
    [events, selectedId],
  );

  const { inputs, update } = useRetexInputs(selected?.id ?? null);
  const taskProgressPct = selected?.closureRecap?.taskProgressPct ?? 0;

  const retexText = useMemo(
    () =>
      selected
        ? buildRetexDraft({
            eventName: selected.name,
            location: selected.location,
            taskProgressPct,
            inputs,
          })
        : "",
    [selected, taskProgressPct, inputs],
  );

  const [aiText, setAiText] = useState<string | null>(null);

  const enrichWithAi = async () => {
    if (!selected || aiBusy) return;
    setAiBusy(true);
    try {
      const bullets = [
        `Événement : ${selected.name} (${selected.location || "lieu n/c"})`,
        `Avancement tâches ${taskProgressPct}%`,
        inputs.highlights ? `Points forts : ${inputs.highlights}` : "",
        inputs.improvements ? `À améliorer : ${inputs.improvements}` : "",
        inputs.followUps ? `Actions de suivi : ${inputs.followUps}` : "",
      ];
      const result = await summarize(
        `Post-mortem ${selected.name}`,
        bullets,
        "Rédige un RETEX structuré avec des recommandations concrètes.",
      );
      setAiText(result.text);
    } catch {
      toastError("Enrichissement IA impossible");
    } finally {
      setAiBusy(false);
    }
  };

  const copyRetex = async () => {
    try {
      await navigator.clipboard.writeText(aiText ?? retexText);
      toastSuccess("RETEX copié");
    } catch {
      toastError("Copie impossible");
    }
  };

  return (
      <div className="space-y-5">
        <header className="ui-surface rounded-2xl border-l-4 border-l-[var(--accent)] p-5">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            <CalendarRange className="h-3.5 w-3.5" /> Événements · V2
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">RETEX événement</h1>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
            Points forts, axes d&apos;amélioration et actions de suivi après chaque salon.
          </p>
        </header>

        <EventsSectionNav basePath="/v2/events" showRetex />

        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          <aside className="ui-surface rounded-2xl p-4">
            <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Événements</h2>
            {loading ? (
              <p className="text-sm text-[color:var(--foreground)]/55">Chargement…</p>
            ) : events.length === 0 ? (
              <p className="text-sm text-[color:var(--foreground)]/55">Aucun événement.</p>
            ) : (
              <ul className="space-y-1.5">
                {events.map((event) => {
                  const active = selected?.id === event.id;
                  return (
                    <li key={event.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(event.id)}
                        className={[
                          "ui-transition w-full rounded-xl border px-3 py-2 text-left",
                          active
                            ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                            : "border-[var(--line)] hover:border-[var(--line-strong)]",
                        ].join(" ")}
                      >
                        <span className="block truncate text-sm font-semibold text-[var(--foreground)]">
                          {event.name}
                        </span>
                        <span className="text-[11px] text-[color:var(--foreground)]/55">
                          {event.status}
                          {event.closureRecap ? " · clôturé" : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>

          {selected ? (
            <section className="space-y-4">
              <div className="ui-surface rounded-2xl p-5">
                <h3 className="mb-1 text-sm font-semibold text-[var(--foreground)]">{selected.name}</h3>
                <p className="text-xs text-[color:var(--foreground)]/55">
                  Avancement des tâches : {taskProgressPct} %
                </p>
              </div>

              <div className="ui-surface rounded-2xl p-5">
                <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Compte-rendu</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/55">
                      Points forts
                    </span>
                    <textarea
                      rows={5}
                      value={inputs.highlights}
                      onChange={(e) => update({ highlights: e.target.value })}
                      placeholder="Ce qui a bien fonctionné…"
                      className="ui-focus-ring mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/55">
                      À améliorer
                    </span>
                    <textarea
                      rows={5}
                      value={inputs.improvements}
                      onChange={(e) => update({ improvements: e.target.value })}
                      placeholder="Points de friction, retours terrain…"
                      className="ui-focus-ring mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/55">
                      Actions de suivi
                    </span>
                    <textarea
                      rows={5}
                      value={inputs.followUps}
                      onChange={(e) => update({ followUps: e.target.value })}
                      placeholder="Décisions et prochaines étapes…"
                      className="ui-focus-ring mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              </div>

              <div className="ui-surface rounded-2xl p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">RETEX généré</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={aiBusy}
                      onClick={() => void enrichWithAi()}
                      className="ui-transition inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-contrast)] disabled:opacity-50"
                    >
                      {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      Enrichir avec l&apos;IA
                    </button>
                    <button
                      type="button"
                      onClick={() => void copyRetex()}
                      className="ui-transition inline-flex items-center gap-1.5 rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[color:var(--foreground)]/70 hover:bg-[var(--surface-soft)]"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copier
                    </button>
                  </div>
                </div>
                <pre className="max-h-[360px] overflow-auto whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-4 text-xs leading-relaxed text-[color:var(--foreground)]/80">
                  {aiText ?? retexText}
                </pre>
              </div>
            </section>
          ) : (
            <div className="ui-surface rounded-2xl p-8 text-center text-sm text-[color:var(--foreground)]/55">
              Sélectionnez un événement pour rédiger son RETEX.
            </div>
          )}
        </div>
      </div>
  );
}
