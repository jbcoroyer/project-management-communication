"use client";

import type { ReactNode } from "react";

export function MetierField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-[0.08em] text-[color:var(--foreground)]/45">
        {label}
      </span>
      {children}
    </label>
  );
}

export const metierInputClass =
  "w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]";

export const metierSelectClass = metierInputClass;

export const metierTextareaClass = `${metierInputClass} min-h-[88px] resize-y`;
