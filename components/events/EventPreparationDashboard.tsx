"use client";

import { AlertTriangle, CheckCircle2, ListTodo, PiggyBank } from "lucide-react";
import BudgetGauge from "./BudgetGauge";
import { computeEventPreparationStats } from "../../lib/eventPreparationStats";
import type { EventRow } from "../../lib/eventTypes";
import type { Task } from "../../lib/types";
import { formatCurrency } from "../../lib/stockUtils";

type Props = {
  event: EventRow;
  tasks: Task[];
  consumedTotal: number;
};

export default function EventPreparationDashboard(props: Props) {
  const { event, tasks, consumedTotal } = props;
  const stats = computeEventPreparationStats(event.id, tasks);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="ui-surface rounded-[22px] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/50">
          Avancement préparation
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-6">
          <div>
            <p className="text-4xl font-semibold text-[var(--foreground)]">{stats.progressPct}%</p>
            <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
              {stats.doneTasks} / {stats.totalTasks} tâches terminées
            </p>
          </div>
          <div className="h-3 flex-1 min-w-[120px] overflow-hidden rounded-full bg-[var(--surface-soft)] ring-1 ring-[var(--line)]">
            <div
              className="h-full rounded-full bg-[color:var(--foreground)]/30 transition-[width]"
              style={{ width: `${stats.progressPct}%` }}
            />
          </div>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          <li className="flex items-center gap-2 text-[color:var(--foreground)]/70">
            <ListTodo className="h-4 w-4 shrink-0" />
            {stats.totalTasks === 0
              ? "Aucune tâche — choisissez un modèle à la création ou ajoutez des tâches."
              : `${stats.totalTasks} tâches liées à cet événement`}
          </li>
          {stats.overdueTasks > 0 ? (
            <li className="flex items-center gap-2 font-semibold text-rose-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {stats.overdueTasks} en retard
            </li>
          ) : (
            <li className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Aucun retard sur les échéances
            </li>
          )}
          {stats.unscheduledOpen > 0 ? (
            <li className="text-amber-800">
              {stats.unscheduledOpen} tâche(s) ouverte(s) sans date limite
            </li>
          ) : null}
        </ul>
      </div>
      <div className="ui-surface rounded-[22px] p-5">
        <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/50">
          <PiggyBank className="h-3.5 w-3.5" />
          Budget événement
        </div>
        <BudgetGauge allocated={event.allocatedBudget} consumed={consumedTotal} />
        <p className="mt-3 text-xs text-[color:var(--foreground)]/55">
          Plafond alloué : {formatCurrency(event.allocatedBudget)}
        </p>
      </div>
    </div>
  );
}
