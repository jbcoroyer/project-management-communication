"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarClock, FileText, Loader2, Sparkles } from "lucide-react";
import V2AppShell from "../AppShell";
import { useCurrentUser } from "../../../lib/useCurrentUser";
import { useTasks } from "../../../lib/useTasks";
import { useEvents } from "../../../lib/useEvents";
import { useSocialPosts } from "../../../lib/useSocialPosts";
import { useInventory } from "../../../lib/useInventory";
import { isLowStock } from "../../../lib/inventoryTypes";
import { DONE_COLUMN_NAME } from "../../../lib/workflowConstants";
import { summarize } from "../../../lib/v2/aiClient";
import { toastError } from "../../../lib/toast";

const FREQ_KEY = "v2-reporting-frequency";
type Frequency = "manuel" | "hebdo" | "mensuel";

export default function V2ReportingPage() {
  const { user } = useCurrentUser();
  const { tasks } = useTasks();
  const { events } = useEvents();
  const { posts } = useSocialPosts();
  const { items } = useInventory();

  const [frequency, setFrequency] = useState<Frequency>("manuel");
  const [summary, setSummary] = useState<string | null>(null);
  const [backend, setBackend] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FREQ_KEY);
      if (raw === "hebdo" || raw === "mensuel" || raw === "manuel") setFrequency(raw);
    } catch {
      /* ignoré */
    }
  }, []);

  const setFreq = (f: Frequency) => {
    setFrequency(f);
    try {
      window.localStorage.setItem(FREQ_KEY, f);
    } catch {
      /* ignoré */
    }
  };

  const now = Date.now();
  const kpis = useMemo(() => {
    const active = tasks.filter((t) => !t.isArchived && !t.parentTaskId && t.column !== DONE_COLUMN_NAME);
    const overdue = active.filter((t) => t.deadline && new Date(t.deadline).getTime() < now);
    const done30 = tasks.filter(
      (t) => t.column === DONE_COLUMN_NAME && t.completedAt && now - new Date(t.completedAt).getTime() < 30 * 864e5,
    );
    const upcomingEvents = events.filter((e) => new Date(e.endDate).getTime() >= now);
    const totalBudget = upcomingEvents.reduce((acc, e) => acc + (e.allocatedBudget || 0), 0);
    const published30 = posts.filter(
      (p) => p.status === "Publié" && p.scheduledAt && now - new Date(p.scheduledAt).getTime() < 30 * 864e5,
    );
    const lowStock = items.filter(isLowStock);
    return {
      active: active.length,
      overdue: overdue.length,
      done30: done30.length,
      upcomingEvents: upcomingEvents.length,
      totalBudget,
      published30: published30.length,
      lowStock: lowStock.length,
    };
  }, [tasks, events, posts, items, now]);

  const generate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const bullets = [
        `${kpis.active} tâches actives, ${kpis.overdue} en retard, ${kpis.done30} terminées sur 30 j`,
        `${kpis.upcomingEvents} événements à venir, budget alloué cumulé ${Math.round(kpis.totalBudget).toLocaleString("fr-FR")} €`,
        `${kpis.published30} posts publiés sur 30 j`,
        `${kpis.lowStock} articles en stock bas`,
      ];
      const res = await summarize("Reporting direction — Service Communication IDENA", bullets, "Rédige une synthèse exécutive claire pour la direction, avec points d'attention et recommandations, en français.");
      setSummary(res.text);
      setBackend(res.backend);
    } catch {
      toastError("Génération du rapport impossible");
    } finally {
      setBusy(false);
    }
  };

  const cards = [
    { label: "Tâches actives", value: kpis.active },
    { label: "En retard", value: kpis.overdue, danger: kpis.overdue > 0 },
    { label: "Terminées (30 j)", value: kpis.done30 },
    { label: "Événements à venir", value: kpis.upcomingEvents },
    { label: "Budget event alloué", value: `${Math.round(kpis.totalBudget).toLocaleString("fr-FR")} €` },
    { label: "Posts publiés (30 j)", value: kpis.published30 },
    { label: "Stock bas", value: kpis.lowStock, danger: kpis.lowStock > 0 },
  ];

  return (
    <V2AppShell
      currentUserName={user?.teamMemberName ?? user?.displayName ?? undefined}
      currentUserEmail={user?.email}
      currentUserAvatarUrl={user?.avatarUrl}
      currentUserJobTitle={user?.jobTitle}
    >
      <div className="space-y-5">
        <header className="ui-surface rounded-2xl border-l-4 border-l-[var(--accent)] p-5">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            <BarChart3 className="h-3.5 w-3.5" /> Reporting direction · V2
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Tableau de bord &amp; synthèse IA</h1>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
            Vue multi-entités consolidée pour la direction, avec résumé généré par IA.
          </p>
        </header>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {cards.map((c) => (
            <div key={c.label} className="ui-surface rounded-2xl p-4">
              <p className={`text-2xl font-bold ${c.danger ? "text-[var(--danger)]" : "text-[var(--foreground)]"}`}>{c.value}</p>
              <p className="mt-1 text-[11px] text-[color:var(--foreground)]/55">{c.label}</p>
            </div>
          ))}
        </div>

        <section className="ui-surface rounded-2xl p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
              <FileText className="h-4 w-4 text-[var(--accent)]" /> Synthèse exécutive
              {backend ? (
                <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--foreground)]/55">
                  {backend === "openrouter" ? "IA" : "local"}
                </span>
              ) : null}
            </h2>
            <button
              type="button"
              onClick={() => void generate()}
              disabled={busy}
              className="ui-transition inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-strong)] disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Générer le rapport
            </button>
          </div>

          {summary ? (
            <pre className="whitespace-pre-wrap rounded-xl bg-[var(--surface-soft)] p-4 text-sm leading-relaxed text-[var(--foreground)]">
              {summary}
            </pre>
          ) : (
            <p className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-10 text-center text-sm text-[color:var(--foreground)]/55">
              Cliquez sur « Générer le rapport » pour une synthèse prête à envoyer à la direction.
            </p>
          )}
        </section>

        <section className="ui-surface rounded-2xl p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
            <CalendarClock className="h-4 w-4 text-[var(--accent)]" /> Envoi programmé
          </h2>
          <p className="mb-3 text-sm text-[color:var(--foreground)]/55">
            Fréquence d'envoi automatique du rapport à la direction.
          </p>
          <div className="flex flex-wrap gap-2">
            {(["manuel", "hebdo", "mensuel"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFreq(f)}
                className={[
                  "ui-transition rounded-xl border px-4 py-2 text-sm font-semibold capitalize",
                  frequency === f ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--line)] text-[color:var(--foreground)]/65 hover:bg-[var(--surface-soft)]",
                ].join(" ")}
              >
                {f}
              </button>
            ))}
          </div>
          {frequency !== "manuel" ? (
            <p className="mt-3 text-xs text-[color:var(--foreground)]/50">
              Programmation enregistrée ({frequency}). Branchez un cron Supabase / Edge Function pour l'envoi effectif.
            </p>
          ) : null}
        </section>
      </div>
    </V2AppShell>
  );
}
