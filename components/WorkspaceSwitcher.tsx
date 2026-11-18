"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { useWorkspace } from "../lib/useWorkspace";
import { toastError, toastSuccess } from "../lib/toast";

type WorkspaceSwitcherProps = {
  /** `toolbar` : compact, pour la top bar. */
  variant?: "sidebar" | "toolbar";
};

const AVATAR_TONES = [
  { bg: "color-mix(in oklab, var(--accent) 18%, var(--surface))", fg: "var(--accent-strong)" },
  { bg: "color-mix(in oklab, var(--foreground) 10%, var(--surface))", fg: "var(--foreground)" },
  { bg: "color-mix(in oklab, var(--success) 16%, var(--surface))", fg: "var(--success)" },
  { bg: "color-mix(in oklab, var(--warning) 18%, var(--surface))", fg: "var(--warning)" },
] as const;

function workspaceInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function toneForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

function WorkspaceAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = workspaceInitials(name);
  const tone = toneForName(name);
  const dim = size === "sm" ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-[11px]";
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-[9px] font-semibold tracking-tight ring-1 ring-[var(--line)]/70",
        dim,
      ].join(" ")}
      style={{ background: tone.bg, color: tone.fg }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export default function WorkspaceSwitcher({ variant = "sidebar" }: WorkspaceSwitcherProps) {
  const { workspaces, workspace, workspaceId, switchWorkspace, createWorkspace, loading } =
    useWorkspace();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const isToolbar = variant === "toolbar";
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  const label = workspace?.name ?? "Espace";
  const roleHint = useMemo(() => {
    if (!workspace?.role) return "Espace de travail";
    if (workspace.role === "owner") return "Propriétaire";
    if (workspace.role === "admin") return "Admin";
    return "Membre";
  }, [workspace?.role]);

  if (loading && !workspace) {
    return (
      <div
        className={["animate-pulse rounded-xl bg-[var(--surface-soft)]", isToolbar ? "h-10 w-44" : "h-11 w-full"].join(
          " ",
        )}
        aria-hidden
      />
    );
  }

  return (
    <div ref={rootRef} className={["relative", isToolbar ? "shrink-0" : ""].join(" ")}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "ui-transition group flex items-center gap-2.5 text-left outline-none",
          "focus-visible:ring-2 focus-visible:ring-[color:var(--foreground)]/20",
          isToolbar
            ? [
                "h-10 max-w-[15.5rem] rounded-xl px-2 pr-2.5",
                "bg-[var(--surface)] ring-1 ring-[var(--line)]",
                "hover:bg-[var(--surface-soft)]/80 hover:ring-[var(--line-strong)]",
                open
                  ? "bg-[var(--surface)] shadow-[var(--shadow-1)] ring-[var(--line-strong)]"
                  : "shadow-[0_1px_0_rgba(20,17,13,0.03)]",
              ].join(" ")
            : [
                "w-full rounded-xl px-2.5 py-2",
                "ring-1 ring-[var(--line)] bg-[var(--surface)]",
                "hover:bg-[var(--surface-soft)]",
                open ? "shadow-[var(--shadow-1)] ring-[var(--line-strong)]" : "",
              ].join(" "),
        ].join(" ")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
      >
        <WorkspaceAvatar name={label} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold leading-tight tracking-tight text-[var(--foreground)]">
            {label}
          </span>
          <span className="mt-0.5 block truncate text-[10.5px] font-medium tracking-[0.02em] text-[color:var(--foreground)]/42">
            {roleHint}
          </span>
        </span>
        <ChevronDown
          className={[
            "h-3.5 w-3.5 shrink-0 text-[color:var(--foreground)]/35 ui-transition",
            "group-hover:text-[color:var(--foreground)]/55",
            open ? "rotate-180 text-[color:var(--foreground)]/55" : "",
          ].join(" ")}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Espaces disponibles"
          className={[
            "absolute z-[70] mt-1.5 overflow-hidden rounded-2xl",
            "border border-[var(--line)] bg-[var(--surface)] py-1.5 shadow-[var(--shadow-2)]",
            "animate-[ui-page-enter_120ms_ease-out]",
            isToolbar ? "left-0 min-w-[17.5rem]" : "left-0 right-0",
          ].join(" ")}
        >
          <div className="px-3 pb-1.5 pt-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/35">
              Vos espaces
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto px-1">
            {workspaces.map((ws) => {
              const active = ws.id === workspaceId;
              return (
                <button
                  key={ws.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={[
                    "ui-transition flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left",
                    active
                      ? "bg-[var(--accent-soft)]"
                      : "hover:bg-[var(--surface-soft)]",
                  ].join(" ")}
                  onClick={() => {
                    setOpen(false);
                    if (!active) void switchWorkspace(ws.id).catch((e) => toastError(String(e?.message ?? e)));
                  }}
                >
                  <WorkspaceAvatar name={ws.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-[var(--foreground)]">
                      {ws.name}
                    </span>
                    <span className="block truncate text-[10.5px] text-[color:var(--foreground)]/40">
                      {ws.role === "owner" ? "Propriétaire" : ws.role === "admin" ? "Admin" : "Membre"}
                    </span>
                  </span>
                  {active ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" aria-hidden />
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="mx-2 my-1.5 border-t border-[var(--line)]/70" />
          <button
            type="button"
            disabled={creating}
            className="ui-transition mx-1 flex w-[calc(100%-0.5rem)] items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[12.5px] font-medium text-[color:var(--foreground)]/65 hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)] disabled:opacity-50"
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
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-[9px] bg-[var(--surface-soft)] ring-1 ring-[var(--line)]/80">
              <Plus className="h-3.5 w-3.5" aria-hidden />
            </span>
            Créer un espace
          </button>
        </div>
      ) : null}
    </div>
  );
}
