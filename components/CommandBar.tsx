"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Command, CornerDownLeft, Search, X } from "lucide-react";

export type CommandAction = {
  id: string;
  label: string;
  hint?: string;
  onSelect: () => void;
};

export default function CommandBar(props: {
  open: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  actions: CommandAction[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const q = props.query.trim().toLowerCase();
    if (!q) return props.actions;
    return props.actions.filter((action) => `${action.label} ${action.hint ?? ""}`.toLowerCase().includes(q));
  }, [props.actions, props.query]);
  const safeActiveIndex = Math.max(0, Math.min(activeIndex, Math.max(filtered.length - 1, 0)));

  useEffect(() => {
    if (!props.open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        props.onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, Math.max(filtered.length - 1, 0)));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const action = filtered[safeActiveIndex];
        if (!action) return;
        action.onSelect();
        props.onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, filtered, props, safeActiveIndex]);

  return (
    <AnimatePresence>
      {props.open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeInOut" }}
          className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-950/30 px-4 pt-24 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]/95 shadow-[0_30px_90px_rgba(20,17,13,0.24)]"
          >
            <div className="flex items-center gap-2 border-b border-[var(--line)] px-3 py-3">
              <Search className="h-4 w-4 text-[color:var(--foreground)]/45" />
              <input
                autoFocus
                value={props.query}
                onChange={(event) => props.onQueryChange(event.target.value)}
                placeholder="Rechercher une action, un admin, un client..."
                className="ui-focus-ring w-full rounded-md bg-transparent text-sm text-[var(--foreground)] placeholder:text-[color:var(--foreground)]/45 focus:outline-none"
              />
              <button
                type="button"
                onClick={props.onClose}
                className="ui-transition rounded-md border border-[var(--line)] p-1 text-[color:var(--foreground)]/60 hover:bg-[var(--surface-soft)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-slate-500">Aucun résultat</p>
              ) : (
                filtered.map((action, index) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => {
                      action.onSelect();
                      props.onClose();
                    }}
                    className={[
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition",
                      index === safeActiveIndex
                        ? "bg-[var(--surface-soft)] text-[color:var(--foreground)]/75"
                        : "text-[var(--foreground)] hover:bg-[var(--surface-soft)]",
                    ].join(" ")}
                  >
                    <span className="font-medium">{action.label}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-[color:var(--foreground)]/45">
                      {action.hint}
                    </span>
                  </button>
                ))
              )}
            </div>
            <div className="flex items-center justify-between border-t border-[var(--line)] px-3 py-2 text-[11px] text-[color:var(--foreground)]/65">
              <span className="inline-flex items-center gap-1">
                <Command className="h-3.5 w-3.5" /> Cmd/Ctrl + K
              </span>
              <span className="inline-flex items-center gap-1">
                <CornerDownLeft className="h-3.5 w-3.5" /> Exécuter
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
