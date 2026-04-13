"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, MessageCircle, Sparkles, X } from "lucide-react";
import { AiAnswerContent } from "../lib/formatAiAnswer";

type AiChatPopupProps = {
  context: string;
  taskTitleToId?: Record<string, string>;
  onOpenTask?: (taskId: string) => void;
};

export default function AiChatPopup({
  context,
  taskTitleToId,
  onOpenTask,
}: AiChatPopupProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => textareaRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  const canSubmit = useMemo(
    () => prompt.trim().length > 0 && !busy,
    [prompt, busy],
  );

  const handleSubmit = useCallback(async () => {
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
  }, [canSubmit, context, prompt]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setError(null);
  }, []);

  const handleClose = useCallback(() => setOpen(false), []);

  const popup =
    mounted &&
    open &&
    createPortal(
      <>
        <button
          type="button"
          aria-label="Fermer le chat IA"
          className="fixed inset-0 z-[140] bg-slate-950/25 backdrop-blur-[1px]"
          onClick={handleClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-chat-popup-title"
          className="ui-surface fixed z-[141] flex max-h-[min(85vh,560px)] w-[min(calc(100vw-1.5rem),420px)] flex-col overflow-hidden rounded-2xl border border-[var(--line-strong)] shadow-[0_24px_80px_rgba(20,17,13,0.22)]"
          style={{
            bottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
            right: "max(1rem, env(safe-area-inset-right, 0px))",
          }}
        >
          <div className="flex shrink-0 items-start justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                <h2
                  id="ai-chat-popup-title"
                  className="text-sm font-semibold text-[var(--foreground)]"
                >
                  Assistant IA
                </h2>
              </div>
              <p className="mt-0.5 text-[11px] text-[color:var(--foreground)]/55">
                Modèle gratuit (quota OpenRouter). Aucune carte bancaire.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="ui-transition shrink-0 rounded-lg border border-transparent p-1.5 text-[color:var(--foreground)]/55 hover:border-[var(--line)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
            <textarea
              ref={textareaRef}
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex. : Résume mes priorités de la semaine…"
              className="ui-focus-ring w-full shrink-0 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[color:var(--foreground)]/45 focus:outline-none"
            />
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => void handleSubmit()}
              className="ui-transition inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--accent)] px-3 py-2.5 text-sm font-semibold text-[#fffdf9] hover:bg-[var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Envoyer
            </button>
            {error && (
              <div className="shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                {error}
              </div>
            )}
            {answer ? (
              <AiAnswerContent
                text={answer}
                onTaskClick={(taskId) => {
                  onOpenTask?.(taskId);
                  handleClose();
                }}
                resolveTaskId={(quotedTitle) => taskTitleToId?.[quotedTitle] ?? null}
              />
            ) : null}
          </div>
        </div>
      </>,
      document.body,
    );

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={handleOpen}
          title="Ouvrir le chat IA"
          aria-expanded={false}
          aria-haspopup="dialog"
          className="ui-transition fixed z-[141] flex h-14 w-14 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--accent)] text-[#fffdf9] shadow-[0_12px_36px_rgba(20,17,13,0.25)] hover:scale-105 hover:bg-[var(--accent-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          style={{
            bottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
            right: "max(1rem, env(safe-area-inset-right, 0px))",
          }}
        >
          <MessageCircle className="h-6 w-6" strokeWidth={2} aria-hidden />
          <span className="sr-only">Ouvrir le chat avec l&apos;IA</span>
        </button>
      )}
      {popup}
    </>
  );
}
