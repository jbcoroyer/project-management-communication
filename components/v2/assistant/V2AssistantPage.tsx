"use client";

import { useMemo, useState } from "react";
import {
  AlarmClock,
  ArrowUpCircle,
  Bot,
  CalendarClock,
  Loader2,
  MessageSquare,
  Search,
  Send,
  Sparkles,
} from "lucide-react";
import V2AppShell from "../AppShell";
import { useCurrentUser } from "../../../lib/useCurrentUser";
import { useTasks } from "../../../lib/useTasks";
import { useEvents } from "../../../lib/useEvents";
import { useInventory } from "../../../lib/useInventory";
import { getSupabaseBrowser } from "../../../lib/supabaseBrowser";
import { markTaskMutatedLocally } from "../../../lib/taskMutatedLocally";
import {
  noDeadlineAgent,
  overdueAgent,
  standupAgent,
  weeklySummaryAgent,
  type AgentResult,
} from "../../../lib/v2/agents";
import { answerQuestion, type QueryAnswer } from "../../../lib/v2/dataQuery";
import { summarize } from "../../../lib/v2/aiClient";
import { toastError, toastSuccess } from "../../../lib/toast";

type AgentId = "weekly" | "overdue" | "standup" | "noDeadline";

const SUGGESTIONS = [
  "Quelles tâches sont en retard ?",
  "Quelles échéances cette semaine ?",
  "Quels articles sont à réapprovisionner ?",
];

export default function V2AssistantPage() {
  const { user } = useCurrentUser();
  const { tasks } = useTasks();
  const { events } = useEvents();
  const { items } = useInventory();

  const userName = user?.teamMemberName ?? user?.displayName ?? null;

  const [activeAgent, setActiveAgent] = useState<AgentId>("weekly");
  const [agentAi, setAgentAi] = useState<string | null>(null);
  const [agentBusy, setAgentBusy] = useState(false);
  const [bumping, setBumping] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<QueryAnswer | null>(null);
  const [answerAi, setAnswerAi] = useState<string | null>(null);
  const [answerBusy, setAnswerBusy] = useState(false);

  const agentResult = useMemo<AgentResult>(() => {
    switch (activeAgent) {
      case "overdue":
        return overdueAgent(tasks);
      case "standup":
        return standupAgent(tasks, userName);
      case "noDeadline":
        return noDeadlineAgent(tasks);
      default:
        return weeklySummaryAgent(tasks);
    }
  }, [activeAgent, tasks, userName]);

  const runAgent = (id: AgentId) => {
    setActiveAgent(id);
    setAgentAi(null);
  };

  const enrichAgent = async () => {
    if (agentBusy) return;
    setAgentBusy(true);
    try {
      const bullets = agentResult.bullets.length ? agentResult.bullets : agentResult.lines;
      const result = await summarize(agentResult.title, bullets, "Formule une synthèse managériale actionnable en français.");
      setAgentAi(result.backend === "openrouter" ? result.text : `${agentResult.title}\n\n${bullets.map((b) => `• ${b}`).join("\n")}`);
    } catch {
      toastError("Enrichissement IA impossible");
    } finally {
      setAgentBusy(false);
    }
  };

  const bumpPriority = async (taskId: string) => {
    setBumping(taskId);
    try {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.from("tasks").update({ priority: "Haute" }).eq("id", taskId);
      if (error) throw error;
      markTaskMutatedLocally(taskId);
      toastSuccess("Tâche passée en priorité haute");
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Mise à jour impossible");
    } finally {
      setBumping(null);
    }
  };

  const ask = (question: string) => {
    const q = question.trim();
    if (!q) return;
    setQuery(q);
    setAnswer(answerQuestion(q, { tasks, events, inventory: items }));
    setAnswerAi(null);
  };

  const explainAnswer = async () => {
    if (!answer || answerBusy) return;
    setAnswerBusy(true);
    try {
      const bullets = answer.bullets.length ? answer.bullets : answer.lines;
      const result = await summarize(answer.title, bullets, `Question : ${query}. Réponds en langage clair.`);
      setAnswerAi(
        result.backend === "openrouter"
          ? result.text
          : `${answer.title}\n\n${bullets.map((b) => `• ${b}`).join("\n")}`,
      );
    } catch {
      toastError("Explication IA impossible");
    } finally {
      setAnswerBusy(false);
    }
  };

  const AGENTS: { id: AgentId; label: string; icon: typeof Bot }[] = [
    { id: "weekly", label: "Résumé semaine", icon: Sparkles },
    { id: "overdue", label: "Relances retards", icon: AlarmClock },
    { id: "standup", label: "Standup", icon: MessageSquare },
    { id: "noDeadline", label: "Sans échéance", icon: CalendarClock },
  ];

  return (
    <V2AppShell
      currentUserName={userName ?? undefined}
      currentUserEmail={user?.email}
      currentUserAvatarUrl={user?.avatarUrl}
      currentUserJobTitle={user?.jobTitle}
    >
      <div className="space-y-5">
        <header className="ui-surface rounded-2xl border-l-4 border-l-[var(--accent)] p-5">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            <Bot className="h-3.5 w-3.5" /> Assistant IA · V2
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Agents &amp; recherche connectée</h1>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
            Des agents qui agissent sur vos données réelles, et des réponses en langage naturel.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* 8.1 Agents actionnables */}
          <section className="ui-surface rounded-2xl p-5">
            <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">Agents contextuels</h2>
            <div className="flex flex-wrap gap-1.5">
              {AGENTS.map((a) => {
                const Icon = a.icon;
                const on = activeAgent === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => runAgent(a.id)}
                    className={[
                      "ui-transition inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
                      on ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "border border-[var(--line)] text-[color:var(--foreground)]/65 hover:bg-[var(--surface-soft)]",
                    ].join(" ")}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {a.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">{agentResult.title}</h3>
                <button
                  type="button"
                  onClick={() => void enrichAgent()}
                  disabled={agentBusy}
                  className="ui-transition inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)] disabled:opacity-50"
                >
                  {agentBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Enrichir IA
                </button>
              </div>

              {agentAi ? (
                <pre className="mb-3 whitespace-pre-wrap rounded-lg bg-[var(--surface-soft)] p-3 text-xs leading-relaxed text-[var(--foreground)]">
                  {agentAi}
                </pre>
              ) : null}

              {agentResult.actionableTasks.length > 0 ? (
                <ul className="space-y-1.5">
                  {agentResult.actionableTasks.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--foreground)]">{t.label}</p>
                        <p className="truncate text-[11px] text-[color:var(--foreground)]/55">{t.meta}</p>
                      </div>
                      <button
                        type="button"
                        disabled={bumping === t.id}
                        onClick={() => void bumpPriority(t.id)}
                        className="ui-transition inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--line-strong)] px-2 py-1 text-[11px] font-semibold text-[color:var(--foreground)]/65 hover:text-[var(--accent)] disabled:opacity-50"
                      >
                        <ArrowUpCircle className="h-3.5 w-3.5" /> Prioriser
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-1 text-sm text-[color:var(--foreground)]/75">
                  {agentResult.lines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* 8.2 Recherche connectée */}
          <section className="ui-surface rounded-2xl p-5">
            <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">Poser une question à la donnée</h2>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
                <Search className="h-4 w-4 text-[color:var(--foreground)]/45" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && ask(query)}
                  placeholder="Ex : quel est le budget du salon SPACE ?"
                  className="ui-focus-ring w-full bg-transparent text-sm text-[var(--foreground)] focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => ask(query)}
                className="ui-transition inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)]"
                aria-label="Rechercher"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => ask(s)}
                  className="ui-transition rounded-full border border-[var(--line)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--foreground)]/60 hover:bg-[var(--surface-soft)]"
                >
                  {s}
                </button>
              ))}
            </div>

            {answer ? (
              <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">{answer.title}</h3>
                  {answer.bullets.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => void explainAnswer()}
                      disabled={answerBusy}
                      className="ui-transition inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)] disabled:opacity-50"
                    >
                      {answerBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      Expliquer
                    </button>
                  ) : null}
                </div>
                {answerAi ? (
                  <pre className="mb-2 whitespace-pre-wrap rounded-lg bg-[var(--surface-soft)] p-3 text-xs leading-relaxed text-[var(--foreground)]">
                    {answerAi}
                  </pre>
                ) : null}
                <ul className="space-y-1 text-sm text-[color:var(--foreground)]/75">
                  {answer.lines.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-10 text-center text-sm text-[color:var(--foreground)]/55">
                Posez une question sur vos tâches, événements ou stock.
              </p>
            )}
          </section>
        </div>
      </div>
    </V2AppShell>
  );
}
