"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { AdminId } from "../lib/types";
import { adminBadgeClassFor } from "../lib/kanbanStyles";
import AdminAvatar from "./AdminAvatar";

/**
 * Sélecteur multi-responsables (photo + couleur), comme sur le board / liste V2.
 * Cumul via cases à cocher ; on garde au moins un assigné si `requireOne`.
 */
export default function AssigneesPicker(props: {
  value: string[];
  options: string[];
  onChange: (next: string[]) => void;
  /** Empêche de retirer le dernier (défaut true, comme le board). */
  requireOne?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const {
    value,
    options,
    onChange,
    requireOne = true,
    className = "",
    "aria-label": ariaLabel = "Responsables",
  } = props;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const optionList = (() => {
    const extras = value.filter((n) => n && !options.includes(n));
    return extras.length ? [...extras, ...options] : options;
  })();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (name: string) => {
    const checked = value.includes(name);
    if (checked) {
      if (requireOne && value.length <= 1) return;
      onChange(value.filter((a) => a !== name));
      return;
    }
    onChange([...value, name]);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`.trim()}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[32px] min-w-[7.5rem] max-w-[14rem] items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-1.5 py-0.5 hover:border-[var(--line-strong)]"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
      >
        {value.length === 0 ? (
          <span className="px-1 text-xs text-[color:var(--foreground)]/40">Choisir…</span>
        ) : (
          <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
            <span className="flex shrink-0 -space-x-1.5">
              {value.slice(0, 3).map((a) => (
                <span
                  key={a}
                  className={[
                    "inline-flex rounded-full ring-1 ring-[var(--surface)]",
                    adminBadgeClassFor(a),
                  ].join(" ")}
                  title={a}
                >
                  <AdminAvatar admin={a as AdminId} size="sm" />
                </span>
              ))}
              {value.length > 3 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-soft)] text-[9px] font-bold text-[color:var(--foreground)]/60">
                  +{value.length - 3}
                </span>
              )}
            </span>
            <span className="truncate text-[11px] font-semibold text-[color:var(--foreground)]/75">
              {value.length === 1
                ? value[0]!.split(" ")[0]
                : `${value.length} pers.`}
            </span>
          </span>
        )}
        <span className="shrink-0 text-[10px] text-[color:var(--foreground)]/40" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable
          className="absolute left-0 top-full z-40 mt-1 max-h-56 min-w-[220px] overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[var(--shadow-2)]"
        >
          {optionList.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-[color:var(--foreground)]/50">
              Aucun collaborateur
            </p>
          ) : (
            optionList.map((name) => {
              const checked = value.includes(name);
              return (
                <label
                  key={name}
                  className={[
                    "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--surface-soft)]",
                    checked ? adminBadgeClassFor(name) : "",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(name)}
                    className="rounded border-[var(--line)]"
                  />
                  <AdminAvatar admin={name as AdminId} size="sm" />
                  <span className="truncate font-medium">{name}</span>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
