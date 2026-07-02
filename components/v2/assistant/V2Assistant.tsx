"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Loader2, PanelRightOpen, Send, Sparkles, X } from "lucide-react";
import { useEvents } from "../../../lib/useEvents";
import { useInventory } from "../../../lib/useInventory";
import { useTasks } from "../../../lib/useTasks";
import { answerQuestion, type QueryAnswer } from "../../../lib/v2/dataQuery";
import { summarize, type AiBackend } from "../../../lib/v2/aiClient";

type Message = { role: "user" | "assistant"; text: string; backend?: AiBackend };

type QuickAction = { label: string; question: string };

function contextFor(pathname: string): { area: string; actions: QuickAction[] } {
  if (pathname.startsWith("/v2/social")) {
    return {
      area: "Réseaux sociaux",
      actions: [
        { label: "Échéances semaine", question: "Quelles échéances cette semaine ?" },
        { label: "Tâches en retard", question: "Quelles tâches sont en retard ?" },
      ],
    };
  }
  if (pathname.startsWith("/v2/events")) {
    return {
      area: "Événements",
      actions: [
        { label: "Événements à venir", question: "Combien d'événements à venir ?" },
        { label: "Tâches en retard", question: "Quelles tâches sont en retard ?" },
      ],
    };
  }
  return {
    area: "Tableau de bord",
    actions: [
      { label: "Résumé du jour", question: "Résumé du jour" },
      { label: "Priorités semaine", question: "Quelles échéances cette semaine ?" },
    ],
  };
}

function formatQueryAnswer(answer: QueryAnswer): string {
  const lines = answer.lines.filter(Boolean);
  if (lines.length === 0) return answer.title;
  return `${answer.title}\n\n${lines.map((line) => `• ${line}`).join("\n")}`;
}

export default function V2Assistant() {
  const pathname = usePathname();
  const { tasks, loadTasks } = useTasks();
  const { events, loadEvents } = useEvents();
  const { items, loadItems } = useInventory();

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const ctx = useMemo(() => contextFor(pathname ?? ""), [pathname]);
  const queryContext = useMemo(
    () => ({ tasks, events, inventory: items }),
    [tasks, events, items],
  );

  useEffect(() => {
    if (!open) return;
    void loadTasks().catch(() => undefined);
    void loadEvents().catch(() => undefined);
    void loadItems().catch(() => undefined);
  }, [open, loadTasks, loadEvents, loadItems]);

  if (!pathname?.startsWith("/v2")) return null;

  const resolveQuestion = async (
    question: string,
    history: Message[],
  ): Promise<{ text: string; backend?: AiBackend }> => {
    const dataAnswer = answerQuestion(question, queryContext, {
      conversationHistory: history.map((m) => ({ role: m.role, text: m.text })),
    });
    const bullets = dataAnswer.bullets.length > 0 ? dataAnswer.bullets : dataAnswer.lines;
    const hasRealData = bullets.some((b) => b.trim().length > 0 && !b.startsWith("…"));

    if (!hasRealData) {
      return { text: formatQueryAnswer(dataAnswer) };
    }

    try {
      const result = await summarize(
        dataAnswer.title,
        bullets,
        `Question posée : « ${question} ». Contexte : ${ctx.area}. Réponds uniquement à partir des données listées, en français, de façon concise et actionnable.`,
      );
      if (result.backend === "openrouter") {
        return { text: result.text, backend: result.backend };
      }
    } catch {
      // Repli sur les données réelles formatées localement.
    }

    return { text: formatQueryAnswer(dataAnswer) };
  };

  const ask = async (question: string, userLabel?: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    const userMessage: Message = { role: "user", text: userLabel ?? q };
    const historyWithUser = [...messages, userMessage];
    setMessages(historyWithUser);
    try {
      const result = await resolveQuestion(q, historyWithUser);
      setMessages((prev) => [...prev, { role: "assistant", text: result.text, backend: result.backend }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Désolé, je n'ai pas pu analyser votre question. Réessayez." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    void ask(text);
  };

  return (
    <div className="pointer-events-none fixed bottom-5 right-5" style={{ zIndex: "calc(var(--z-overlay) + 3)" }}>
      {open ? (
        <div className="pointer-events-auto mb-3 flex h-[520px] w-[360px] max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-2)]">
          <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--accent)] px-4 py-3 text-[var(--accent-contrast)]">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <div>
                <p className="text-sm font-semibold leading-none">Assistant IDENA</p>
                <p className="mt-0.5 text-[11px] opacity-80">Contexte : {ctx.area}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 hover:bg-white/15"
              aria-label="Fermer l'assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-[color:var(--foreground)]/60">
                  Posez une question sur vos tâches, événements ou stock — je réponds à partir de vos données réelles.
                </p>
                <div className="flex flex-wrap gap-2">
                  {ctx.actions.map((a) => (
                    <button
                      key={a.label}
                      type="button"
                      onClick={() => void ask(a.question, a.label)}
                      className="ui-transition inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-contrast)]"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={[
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    m.role === "user"
                      ? "ml-auto bg-[var(--accent)] text-[var(--accent-contrast)]"
                      : "bg-[var(--surface-soft)] text-[var(--foreground)]",
                  ].join(" ")}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                  {m.role === "assistant" && m.backend ? (
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-[color:var(--foreground)]/40">
                      {m.backend === "openrouter" ? "IA" : "données"}
                    </p>
                  ) : null}
                </div>
              ))
            )}
            {busy ? (
              <div className="flex items-center gap-2 text-xs text-[color:var(--foreground)]/55">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analyse en cours…
              </div>
            ) : null}
          </div>

          <div className="border-t border-[var(--line)] p-3">
            <Link
              href="/v2/assistant"
              onClick={() => setOpen(false)}
              className="ui-transition mb-2 flex items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] px-3 py-1.5 text-[11px] font-semibold text-[color:var(--foreground)]/65 hover:bg-[var(--surface-soft)]"
            >
              <PanelRightOpen className="h-3.5 w-3.5" />
              Agents &amp; recherche connectée
            </Link>
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ex : la todo d'Alexandre cette semaine"
                className="ui-focus-ring flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={busy || !input.trim()}
                className="ui-transition inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)] text-[var(--accent-contrast)] disabled:opacity-50"
                aria-label="Envoyer"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ui-transition pointer-events-auto ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-contrast)] shadow-[var(--shadow-2)] hover:bg-[var(--accent-strong)]"
        aria-label="Ouvrir l'assistant IA"
      >
        <Bot className="h-6 w-6" />
      </button>
    </div>
  );
}
