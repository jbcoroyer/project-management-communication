"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Clock, Coffee, Loader2, Sparkles, Sun } from "lucide-react";
import V2Inbox from "../dashboard/V2Inbox";
import { useCurrentUser } from "../../../lib/useCurrentUser";
import { useTasks } from "../../../lib/useTasks";
import { buildDayPlan, type PlanBlock } from "../../../lib/v2/planner";
import { summarize } from "../../../lib/v2/aiClient";
import { toastError } from "../../../lib/toast";

const KIND_ICON: Record<PlanBlock["kind"], typeof Clock> = {
  task: Clock,
  break: Coffee,
  focus: Sun,
};

export default function V2TodoPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { tasks } = useTasks();
  const [tab, setTab] = useState<"agenda" | "inbox">("agenda");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiText, setAiText] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);
  const userName = user?.teamMemberName ?? user?.displayName ?? null;

  const plan = useMemo(() => buildDayPlan(tasks, userName, now), [tasks, userName, now]);

  const totalMinutes = useMemo(
    () =>
      plan
        .filter((b) => b.kind === "task")
        .reduce((acc, b) => {
          const [sh, sm] = b.start.split(":").map(Number);
          const [eh, em] = b.end.split(":").map(Number);
          return acc + (eh * 60 + em - (sh * 60 + sm));
        }, 0),
    [plan],
  );

  const enrich = async () => {
    if (aiBusy) return;
    setAiBusy(true);
    try {
      const bullets = plan
        .filter((b) => b.kind === "task")
        .map((b) => `${b.start}-${b.end} : ${b.title} (${b.reason})`);
      if (bullets.length === 0) bullets.push("Aucune tâche assignée aujourd'hui");
      const result = await summarize(
        `Mon agenda du ${now.toLocaleDateString("fr-FR")}`,
        bullets,
        "Donne 2-3 conseils pour optimiser cette journée (regroupement, ordre, énergie).",
      );
      setAiText(result.text);
    } catch {
      toastError("Enrichissement IA impossible");
    } finally {
      setAiBusy(false);
    }
  };

  const openTask = () => router.push("/v2/dashboard/kanban");

  return (
      <div className="space-y-5">
        <header className="ui-surface rounded-2xl border-l-4 border-l-[var(--accent)] p-5">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            <CalendarCheck className="h-3.5 w-3.5" /> Mon espace · V2
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
            {userName ? `Bonjour ${userName.split(" ")[0]}` : "Mon agenda"}
          </h1>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
            Agenda du jour généré automatiquement et boîte de réception personnelle.
          </p>
        </header>

        <nav className="flex items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-1">
          {[
            { id: "agenda" as const, label: "Agenda du jour", icon: CalendarCheck },
            { id: "inbox" as const, label: "Inbox", icon: Clock },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={[
                  "ui-transition inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
                  active ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "text-[color:var(--foreground)]/60 hover:bg-[var(--surface)]",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </nav>

        {tab === "agenda" ? (
          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <section className="ui-surface rounded-2xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[var(--foreground)]">Planning time-blocké</h2>
                  <p className="text-xs text-[color:var(--foreground)]/55">
                    {Math.round((totalMinutes / 60) * 10) / 10} h de travail planifiées
                  </p>
                </div>
              </div>

              {!userName ? (
                <p className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-10 text-center text-sm text-[color:var(--foreground)]/55">
                  Connectez-vous pour générer votre agenda personnalisé.
                </p>
              ) : plan.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-10 text-center text-sm text-[color:var(--foreground)]/55">
                  Aucune tâche à planifier aujourd'hui. Profitez-en !
                </p>
              ) : (
                <ol className="space-y-2">
                  {plan.map((block, idx) => {
                    const Icon = KIND_ICON[block.kind];
                    const isTask = block.kind === "task";
                    return (
                      <li key={idx}>
                        <button
                          type="button"
                          onClick={isTask ? openTask : undefined}
                          className={[
                            "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left",
                            isTask
                              ? "ui-transition border-[var(--line)] bg-[var(--surface)] hover:border-[var(--accent)]"
                              : "border-dashed border-[var(--line)] bg-[var(--surface-soft)]",
                          ].join(" ")}
                        >
                          <span className="flex w-16 shrink-0 flex-col text-[11px] font-semibold text-[color:var(--foreground)]/60">
                            <span>{block.start}</span>
                            <span className="opacity-60">{block.end}</span>
                          </span>
                          <span
                            className={[
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                              isTask ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "bg-[var(--surface)] text-[color:var(--foreground)]/45",
                            ].join(" ")}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-[var(--foreground)]">{block.title}</span>
                            <span className="block truncate text-[11px] text-[color:var(--foreground)]/55">{block.reason}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            <section className="ui-surface rounded-2xl p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-[var(--foreground)]">Coup de pouce IA</h2>
                <button
                  type="button"
                  onClick={() => void enrich()}
                  disabled={aiBusy || plan.length === 0}
                  className="ui-transition inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)] disabled:opacity-50"
                >
                  {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Optimiser
                </button>
              </div>
              {aiText ? (
                <pre className="whitespace-pre-wrap rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-4 text-sm leading-relaxed text-[var(--foreground)]">
                  {aiText}
                </pre>
              ) : (
                <p className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-8 text-center text-xs text-[color:var(--foreground)]/55">
                  Lancez « Optimiser » pour obtenir des conseils d'organisation sur votre journée.
                </p>
              )}
            </section>
          </div>
        ) : (
          <V2Inbox tasks={tasks} currentUserName={userName} now={now.getTime()} onOpenTask={openTask} />
        )}
      </div>
  );
}
