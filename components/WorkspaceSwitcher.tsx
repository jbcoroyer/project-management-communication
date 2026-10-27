"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useWorkspace } from "../lib/useWorkspace";
import { toastError, toastSuccess } from "../lib/toast";

export default function WorkspaceSwitcher() {
  const { workspaces, workspace, workspaceId, switchWorkspace, createWorkspace, loading } =
    useWorkspace();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  if (loading && !workspace) {
    return <div className="h-9 animate-pulse rounded-lg bg-[var(--surface-soft)]" aria-hidden />;
  }

  const label = workspace?.name ?? "Espace";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-2 text-left hover:bg-[var(--surface-soft)]"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-medium uppercase tracking-[0.1em] text-[color:var(--foreground)]/40">
            Espace
          </span>
          <span className="block truncate text-[13px] font-medium text-[var(--foreground)]">
            {label}
          </span>
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-[color:var(--foreground)]/40" aria-hidden />
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[60] cursor-default"
            aria-label="Fermer"
            onClick={() => setOpen(false)}
          />
          <div
            role="listbox"
            className="absolute left-0 right-0 z-[70] mt-1 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] py-1 shadow-lg"
          >
            {workspaces.map((ws) => {
              const active = ws.id === workspaceId;
              return (
                <button
                  key={ws.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] hover:bg-[var(--surface-soft)]"
                  onClick={() => {
                    setOpen(false);
                    if (!active) void switchWorkspace(ws.id).catch((e) => toastError(String(e?.message ?? e)));
                  }}
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{ws.name}</span>
                  {active ? <Check className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden /> : null}
                </button>
              );
            })}
            <div className="my-1 border-t border-[var(--line)]/70" />
            <button
              type="button"
              disabled={creating}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] text-[color:var(--foreground)]/70 hover:bg-[var(--surface-soft)] disabled:opacity-50"
              onClick={() => {
                const name = window.prompt("Nom du nouvel espace ?");
                if (name === null) return;
                setCreating(true);
                void createWorkspace(name.trim() || undefined)
                  .then(() => toastSuccess("Espace créé"))
                  .catch((e) => toastError(String(e?.message ?? e)))
                  .finally(() => {
                    setCreating(false);
                    setOpen(false);
                  });
              }}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Créer un espace
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
