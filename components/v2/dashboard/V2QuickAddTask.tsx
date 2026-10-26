"use client";

import { useState, type RefObject } from "react";
import { CornerDownLeft, Plus } from "lucide-react";
import { TuesdayLoader } from "@/components/brand";

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
      className="flex h-10 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)]/70 px-3 focus-within:border-[color:var(--foreground)]/25 focus-within:bg-[var(--surface)]"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[color:var(--foreground)]/40">
        {busy ? <TuesdayLoader size={16} label="Enregistrement…" /> : <Plus className="h-3.5 w-3.5" />}
      </span>
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        disabled={disabled || busy}
        placeholder="Ajouter une tâche…"
        aria-label="Création rapide de tâche"
        className="w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[color:var(--foreground)]/40 focus:outline-none disabled:opacity-60"
      />
      <kbd className="hidden shrink-0 items-center gap-1 text-[10px] text-[color:var(--foreground)]/35 sm:inline-flex">
        <CornerDownLeft className="h-3 w-3" />
      </kbd>
    </form>
  );
}
