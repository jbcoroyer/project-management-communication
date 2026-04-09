"use client";

import { formatCurrency } from "../../lib/stockUtils";

type BudgetGaugeProps = {
  allocated: number;
  consumed: number;
  label?: string;
};

export default function BudgetGauge(props: BudgetGaugeProps) {
  const { allocated, consumed, label = "Budget" } = props;
  const over = allocated > 0 ? consumed > allocated : consumed > 0;
  const ratio = allocated > 0 ? consumed / allocated : consumed > 0 ? 1 : 0;
  const pct = Math.min(100, Math.max(0, ratio * 100));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/45">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">
            {formatCurrency(consumed)}
            <span className="text-base font-medium text-[color:var(--foreground)]/50"> / {formatCurrency(allocated)}</span>
          </p>
        </div>
        {over && (
          <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
            Dépassement
          </span>
        )}
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--surface-soft)] ring-1 ring-[var(--line)]">
        <div
          className={[
            "h-full rounded-full transition-[width] duration-500 ease-out",
            over ? "bg-rose-600" : "bg-[color:var(--foreground)]/28",
          ].join(" ")}
          style={{ width: `${Math.min(100, allocated > 0 ? pct : consumed > 0 ? 100 : 0)}%` }}
        />
      </div>
      <p className="text-xs text-[color:var(--foreground)]/55">
        {allocated > 0
          ? `${pct.toFixed(0)} % du budget alloué utilisé`
          : "Aucun budget alloué : la jauge reflète uniquement les coûts constatés."}
      </p>
    </div>
  );
}
