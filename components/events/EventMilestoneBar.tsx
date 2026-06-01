"use client";

import { buildEventMilestones } from "../../lib/eventMilestones";
import type { EventRow } from "../../lib/eventTypes";
import type { Task } from "../../lib/types";

type Props = {
  event: EventRow;
  tasks: Task[];
  onFilterMilestone?: (dateIso: string) => void;
  activeFilterDate?: string | null;
};

export default function EventMilestoneBar(props: Props) {
  const { event, tasks, onFilterMilestone, activeFilterDate } = props;
  const milestones = buildEventMilestones(event.startDate, event.endDate, tasks);

  return (
    <div className="ui-surface rounded-[22px] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/50">
        Jalons de préparation
      </p>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {milestones.map((m) => {
          const active = activeFilterDate === m.dateIso;
          const tone =
            m.status === "late"
              ? "border-rose-300 bg-rose-50 text-rose-900"
              : m.status === "current"
                ? "border-[var(--line-strong)] bg-[var(--foreground)] text-[var(--accent-contrast)]"
                : m.status === "done"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/70";
          return (
            <button
              key={m.offset}
              type="button"
              onClick={() => onFilterMilestone?.(m.dateIso)}
              className={[
                "ui-transition shrink-0 rounded-xl border px-3 py-2 text-left min-w-[88px]",
                tone,
                active ? "ring-2 ring-[var(--accent)] ring-offset-2" : "",
              ].join(" ")}
            >
              <p className="text-xs font-bold">{m.label}</p>
              <p className="mt-0.5 text-[10px] opacity-80">
                {new Date(`${m.dateIso}T12:00:00`).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
              {m.openTasksDueBy > 0 ? (
                <p className="mt-1 text-[10px] font-semibold">{m.openTasksDueBy} tâche(s) ouverte(s)</p>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
