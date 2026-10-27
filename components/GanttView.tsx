"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  isSameDay,
  isWeekend,
  max as maxDate,
  min as minDate,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, GanttChart } from "lucide-react";
import AdminAvatar from "./AdminAvatar";
import type { AdminId, Task } from "../lib/types";
import { adminSolidColorFor } from "../lib/kanbanStyles";

type GanttViewProps = {
  tasks: Task[];
  admins: string[];
  currentUserName?: string | null;
  onSelectTask: (taskId: string) => void;
};

type Zoom = "day" | "week";

type GanttRow = {
  task: Task;
  start: Date;
  end: Date;
  owner: string;
  color: string;
  undated: boolean;
};

const DAY_W_DAY = 44;
const DAY_W_WEEK = 28;
const ROW_H = 40;
const LABEL_W = 220;

function parseDay(value?: string | null): Date | null {
  if (!value) return null;
  const d = parseISO(value.length <= 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

function taskRange(task: Task, fallback: Date): { start: Date; end: Date; undated: boolean } {
  const projectedDates = (task.projectedWork ?? [])
    .map((p) => parseDay(p.date))
    .filter((d): d is Date => Boolean(d))
    .sort((a, b) => a.getTime() - b.getTime());

  const request = parseDay(task.requestDate);
  const created = parseDay(task.createdAt ?? null);
  const deadline = parseDay(task.deadline);

  let start: Date | null =
    projectedDates[0] ?? request ?? created ?? null;
  let end: Date | null =
    projectedDates[projectedDates.length - 1] ?? deadline ?? null;

  if (request) start = start ? minDate([start, request]) : request;
  if (created) start = start ? minDate([start, created]) : created;
  if (deadline) end = end ? maxDate([end, deadline]) : deadline;

  if (start && !end) {
    const days = Math.max(1, Math.ceil(Number(task.estimatedDays) || 1));
    end = addDays(start, days - 1);
  }
  if (!start && end) {
    const days = Math.max(1, Math.ceil(Number(task.estimatedDays) || 1));
    start = addDays(end, -(days - 1));
  }

  if (!start || !end) {
    return { start: fallback, end: fallback, undated: true };
  }
  if (end.getTime() < start.getTime()) end = start;
  return { start: startOfDay(start), end: startOfDay(end), undated: false };
}

export default function GanttView({
  tasks,
  admins,
  currentUserName,
  onSelectTask,
}: GanttViewProps) {
  const [zoom, setZoom] = useState<Zoom>("week");
  const [anchor, setAnchor] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1, locale: fr }),
  );

  const dayWidth = zoom === "day" ? DAY_W_DAY : DAY_W_WEEK;
  const visibleDays = zoom === "day" ? 21 : 56;

  const rangeStart = useMemo(
    () => startOfDay(anchor),
    [anchor],
  );
  const rangeEnd = useMemo(
    () => addDays(rangeStart, visibleDays - 1),
    [rangeStart, visibleDays],
  );
  const days = useMemo(
    () => eachDayOfInterval({ start: rangeStart, end: rangeEnd }),
    [rangeStart, rangeEnd],
  );

  const today = startOfDay(new Date());

  const rows = useMemo<GanttRow[]>(() => {
    const roots = tasks.filter((t) => !t.parentTaskId && !t.isArchived);
    return roots
      .map((task) => {
        const { start, end, undated } = taskRange(task, today);
        const owner =
          task.admins[0] ||
          (currentUserName && task.admins.includes(currentUserName)
            ? currentUserName
            : admins[0]) ||
          "—";
        return {
          task,
          start,
          end,
          owner,
          color: adminSolidColorFor(owner),
          undated,
        };
      })
      .sort((a, b) => {
        if (a.undated !== b.undated) return a.undated ? 1 : -1;
        return a.start.getTime() - b.start.getTime();
      });
  }, [admins, currentUserName, tasks, today]);

  const monthLabels = useMemo(() => {
    const labels: { key: string; label: string; span: number }[] = [];
    for (const day of days) {
      const key = format(day, "yyyy-MM");
      const last = labels[labels.length - 1];
      if (last && last.key === key) {
        last.span += 1;
      } else {
        labels.push({
          key,
          label: format(day, "MMMM yyyy", { locale: fr }),
          span: 1,
        });
      }
    }
    return labels;
  }, [days]);

  const shift = (dir: -1 | 1) => {
    const step = zoom === "day" ? 7 : 14;
    setAnchor((prev) => addDays(prev, dir * step));
  };

  const goToday = () => {
    setAnchor(startOfWeek(new Date(), { weekStartsOn: 1, locale: fr }));
  };

  const chartWidth = days.length * dayWidth;

  return (
    <section className="ui-surface overflow-hidden rounded-2xl">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
        <div className="flex items-center gap-2">
          <GanttChart className="h-4 w-4 text-[var(--accent)]" aria-hidden />
          <div>
            <h2 className="text-sm font-semibold text-[var(--foreground)]">Vue Gantt</h2>
            <p className="text-[11px] text-[color:var(--foreground)]/50">
              Planning des tâches (dates, deadlines, créneaux planifiés)
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-[var(--line)]">
            <button
              type="button"
              className={[
                "px-2.5 py-1.5 text-xs font-semibold",
                zoom === "week"
                  ? "bg-[var(--surface-soft)] text-[var(--foreground)]"
                  : "text-[color:var(--foreground)]/55",
              ].join(" ")}
              onClick={() => setZoom("week")}
            >
              Mois
            </button>
            <button
              type="button"
              className={[
                "px-2.5 py-1.5 text-xs font-semibold",
                zoom === "day"
                  ? "bg-[var(--surface-soft)] text-[var(--foreground)]"
                  : "text-[color:var(--foreground)]/55",
              ].join(" ")}
              onClick={() => setZoom("day")}
            >
              3 semaines
            </button>
          </div>
          <button type="button" className="ui-btn ui-btn-ghost h-8 px-2" onClick={() => shift(-1)}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" className="ui-btn ui-btn-ghost h-8 px-2.5 text-xs" onClick={goToday}>
            Aujourd’hui
          </button>
          <button type="button" className="ui-btn ui-btn-ghost h-8 px-2" onClick={() => shift(1)}>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="px-4 py-12 text-center text-sm text-[color:var(--foreground)]/50">
          Aucune tâche à afficher sur le Gantt.
        </div>
      ) : (
        <div className="overflow-auto">
          <div className="min-w-max">
            {/* En-têtes mois + jours */}
            <div className="sticky top-0 z-20 flex border-b border-[var(--line)] bg-[var(--surface)]">
              <div
                className="sticky left-0 z-30 shrink-0 border-r border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--foreground)]/45"
                style={{ width: LABEL_W }}
              >
                Tâche
              </div>
              <div>
                <div className="flex border-b border-[var(--line)]/70">
                  {monthLabels.map((m) => (
                    <div
                      key={m.key}
                      className="truncate px-2 py-1 text-[11px] font-semibold capitalize text-[color:var(--foreground)]/70"
                      style={{ width: m.span * dayWidth }}
                    >
                      {m.label}
                    </div>
                  ))}
                </div>
                <div className="flex">
                  {days.map((day) => {
                    const weekend = isWeekend(day);
                    const isToday = isSameDay(day, today);
                    return (
                      <div
                        key={day.toISOString()}
                        className={[
                          "flex flex-col items-center justify-center border-r border-[var(--line)]/40 py-1 text-[10px]",
                          weekend ? "bg-[var(--surface-soft)]/70" : "",
                          isToday ? "bg-[color:var(--accent)]/10 font-bold text-[var(--accent)]" : "text-[color:var(--foreground)]/50",
                        ].join(" ")}
                        style={{ width: dayWidth }}
                      >
                        <span className="uppercase">{format(day, "EEEEE", { locale: fr })}</span>
                        <span>{format(day, "d")}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Lignes */}
            <div className="relative">
              {rows.map((row) => {
                const startOffset = differenceInCalendarDays(row.start, rangeStart);
                const endOffset = differenceInCalendarDays(row.end, rangeStart);
                const clippedStart = Math.max(0, startOffset);
                const clippedEnd = Math.min(days.length - 1, endOffset);
                const visible = clippedEnd >= 0 && clippedStart <= days.length - 1;
                const barLeft = clippedStart * dayWidth + 4;
                const barWidth = Math.max(dayWidth - 8, (clippedEnd - clippedStart + 1) * dayWidth - 8);

                return (
                  <div
                    key={row.task.id}
                    className="flex border-b border-[var(--line)]/50 hover:bg-[var(--surface-soft)]/40"
                    style={{ height: ROW_H }}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectTask(row.task.id)}
                      className="sticky left-0 z-10 flex shrink-0 items-center gap-2 border-r border-[var(--line)] bg-[var(--surface)] px-3 text-left"
                      style={{ width: LABEL_W }}
                    >
                      <AdminAvatar admin={row.owner as AdminId} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-medium text-[var(--foreground)]">
                          {row.task.projectName || "Sans titre"}
                        </span>
                        <span className="block truncate text-[10px] text-[color:var(--foreground)]/45">
                          {row.task.column}
                          {row.undated ? " · sans date" : ""}
                        </span>
                      </span>
                    </button>

                    <div className="relative" style={{ width: chartWidth }}>
                      {/* weekends */}
                      {days.map((day, i) =>
                        isWeekend(day) ? (
                          <div
                            key={`bg-${day.toISOString()}`}
                            className="absolute inset-y-0 bg-[var(--surface-soft)]/50"
                            style={{ left: i * dayWidth, width: dayWidth }}
                          />
                        ) : null,
                      )}
                      {/* today line */}
                      {days.some((d) => isSameDay(d, today)) ? (
                        <div
                          className="absolute inset-y-0 w-px bg-[var(--accent)]/70"
                          style={{
                            left:
                              differenceInCalendarDays(today, rangeStart) * dayWidth +
                              dayWidth / 2,
                          }}
                        />
                      ) : null}

                      {visible ? (
                        <button
                          type="button"
                          title={`${row.task.projectName} · ${format(row.start, "dd/MM")} → ${format(row.end, "dd/MM")}`}
                          onClick={() => onSelectTask(row.task.id)}
                          className="absolute top-1/2 flex h-7 -translate-y-1/2 items-center overflow-hidden rounded-md px-2 text-left text-[11px] font-semibold text-white shadow-sm transition hover:brightness-110"
                          style={{
                            left: barLeft,
                            width: barWidth,
                            backgroundColor: row.undated
                              ? "color-mix(in oklab, var(--foreground) 35%, transparent)"
                              : row.color,
                          }}
                        >
                          <span className="truncate">{row.task.projectName}</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
