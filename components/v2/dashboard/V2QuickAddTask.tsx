"use client";

import { useState, type RefObject } from "react";
import { CornerDownLeft, Loader2, Plus } from "lucide-react";

export default function V2QuickAddTask({
  inputRef,
  onQuickAdd,
  disabled,
}: {
  inputRef?: RefObject<HTMLInputElement | null>;
  onQuickAdd: (title: string) => Promise<void> | void;
  disabled?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed || busy || disabled) return;
    setBusy(true);
    try {
      await onQuickAdd(trimmed);
      setTitle("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="flex items-center gap-2 rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2 focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--ring)]"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)]">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
      </span>
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        disabled={disabled || busy}
        placeholder="Ajouter une tâche en 3 secondes…"
        aria-label="Création rapide de tâche"
        className="w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[color:var(--foreground)]/45 focus:outline-none disabled:opacity-60"
      />
      <kbd className="hidden shrink-0 items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-1.5 py-0.5 text-[10px] text-[color:var(--foreground)]/55 sm:inline-flex">
        <CornerDownLeft className="h-3 w-3" /> Entrée
      </kbd>
    </form>
  );
}
