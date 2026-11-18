"use client";

import type { LucideIcon } from "lucide-react";

type MetierEmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export default function MetierEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: MetierEmptyStateProps) {
  return (
    <div className="ui-surface flex flex-col items-start gap-3 rounded-2xl border border-dashed border-[var(--line)] px-6 py-10">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-[var(--accent)]">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div>
        <h2 className="text-base font-semibold text-[var(--foreground)]">{title}</h2>
        <p className="mt-1 max-w-lg text-sm text-[color:var(--foreground)]/55">{description}</p>
      </div>
      {actionLabel && onAction ? (
        <button type="button" className="ui-btn ui-btn-primary mt-1 text-xs" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
