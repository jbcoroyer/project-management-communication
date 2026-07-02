"use client";

import { useEffect, useMemo } from "react";
import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import { Command as CommandIcon, CornerDownLeft, Search } from "lucide-react";

export type PaletteAction = {
  id: string;
  label: string;
  group: string;
  hint?: string;
  keywords?: string[];
  perform: () => void;
};

export default function V2CommandPalette({
  open,
  onClose,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  actions: PaletteAction[];
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  const groups = useMemo(() => {
    const map = new Map<string, PaletteAction[]>();
    for (const action of actions) {
      const arr = map.get(action.group) ?? [];
      arr.push(action);
      map.set(action.group, arr);
    }
    return Array.from(map.entries());
  }, [actions]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: "easeInOut" }}
          className="fixed inset-0 z-[90] flex items-start justify-center bg-[color:var(--foreground)]/25 px-4 pt-[12vh] backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-2)]"
            onClick={(event) => event.stopPropagation()}
          >
            <Command
              label="Palette de commandes"
              className="[&_[cmdk-input-wrapper]]:flex"
              loop
            >
              <div className="flex items-center gap-2 border-b border-[var(--line)] px-3 py-3">
                <Search className="h-4 w-4 text-[color:var(--foreground)]/45" aria-hidden />
                <Command.Input
                  autoFocus
                  placeholder="Tapez une commande ou recherchez…"
                  className="w-full bg-transparent text-sm text-[var(--foreground)] placeholder:text-[color:var(--foreground)]/45 focus:outline-none"
                />
                <kbd className="rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-1.5 py-0.5 text-[10px] text-[color:var(--foreground)]/55">
                  Échap
                </kbd>
              </div>

              <Command.List className="max-h-[55vh] overflow-y-auto p-2">
                <Command.Empty className="px-2 py-8 text-center text-sm text-[color:var(--foreground)]/50">
                  Aucun résultat
                </Command.Empty>

                {groups.map(([group, items]) => (
                  <Command.Group
                    key={group}
                    heading={group}
                    className="mb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-[color:var(--foreground)]/40"
                  >
                    {items.map((action) => (
                      <Command.Item
                        key={action.id}
                        value={`${action.label} ${(action.keywords ?? []).join(" ")}`}
                        onSelect={() => {
                          action.perform();
                          onClose();
                        }}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm text-[var(--foreground)] data-[selected=true]:bg-[var(--accent-soft)] data-[selected=true]:text-[var(--foreground)]"
                      >
                        <span className="font-medium">{action.label}</span>
                        {action.hint ? (
                          <kbd className="rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-1.5 py-0.5 text-[10px] text-[color:var(--foreground)]/55">
                            {action.hint}
                          </kbd>
                        ) : null}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>

              <div className="flex items-center justify-between border-t border-[var(--line)] px-3 py-2 text-[11px] text-[color:var(--foreground)]/65">
                <span className="inline-flex items-center gap-1">
                  <CommandIcon className="h-3.5 w-3.5" aria-hidden /> Ctrl/Cmd + K
                </span>
                <span className="inline-flex items-center gap-1">
                  <CornerDownLeft className="h-3.5 w-3.5" aria-hidden /> Exécuter
                </span>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
