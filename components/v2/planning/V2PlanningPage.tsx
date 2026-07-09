"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GanttChartSquare,
  LayoutGrid,
  Scale,
  ShieldAlert,
} from "lucide-react";
import { useTasks } from "../../../lib/useTasks";
import type { Task } from "../../../lib/types";
import { DONE_COLUMN_NAME } from "../../../lib/workflowConstants";
import {
  buildWorkload,
  detectConflicts,
  DAILY_CAPACITY_HOURS,
} from "../../../lib/v2/workload";

type ViewId = "week" | "month" | "timeline" | "workload";

function taskPrimaryDate(task: Task): Date | null {
  const slot = task.projectedWork.find((p) => p.date);
  const raw = slot?.date ?? task.deadline;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

const PRIORITY_DOT: Record<string, string> = {
  Haute: "bg-rose-500",
  Moyenne: "bg-amber-500",
  Basse: "bg-slate-400",
};

export default function V2PlanningPage() {
  const { tasks } = useTasks();
  const [view, setView] = useState<ViewId>("week");
  const [anchor, setAnchor] = useState<Date>(() => new Date());

  const activeTasks = useMemo(
    () => tasks.filter((t) => !t.isArchived && !t.parentTaskId && t.column !== DONE_COLUMN_NAME),
    [tasks],
  );

  const workload = useMemo(() => buildWorkload(tasks), [tasks]);
  const conflicts = useMemo(() => detectConflicts(tasks, workload), [tasks, workload]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchor, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [anchor]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [anchor]);

  const tasksForDay = (day: Date) =>
    activeTasks.filter((t) => {
      const d = taskPrimaryDate(t);
      return d ? isSameDay(d, day) : false;
    });

  const navigate = (dir: -1 | 1) => {
    if (view === "month" || view === "timeline") {
      setAnchor((prev) => (dir === 1 ? addMonths(prev, 1) : subMonths(prev, 1)));
    } else {
      setAnchor((prev) => addDays(prev, dir * 7));
    }
  };

  const rangeLabel =
    view === "week"
      ? `Semaine du ${format(weekDays[0], "d MMM", { locale: fr })}`
      : format(anchor, "MMMM yyyy", { locale: fr });

  // Timeline (mois courant)
  const timelineStart = startOfMonth(anchor);
  const timelineEnd = endOfMonth(anchor);
  const timelineTasks = useMemo(
    () =>
      activeTasks
        .map((t) => {
          const end = t.deadline ? new Date(t.deadline) : taskPrimaryDate(t);
          const startSlot = t.projectedWork.find((p) => p.date);
          const start = startSlot ? new Date(startSlot.date) : end;
          if (!start || !end) return null;
          return { task: t, start, end: end < start ? start : end };
        })
        .filter((x): x is { task: Task; start: Date; end: Date } => x !== null)
        .filter((x) => isWithinInterval(x.start, { start: timelineStart, end: timelineEnd }) || isWithinInterval(x.end, { start: timelineStart, end: timelineEnd }))
        .sort((a, b) => a.start.getTime() - b.start.getTime())
        .slice(0, 40),
    [activeTasks, timelineStart, timelineEnd],
  );
  const totalDays = Math.max(1, monthDays.length);

  return (
      <div className="space-y-5">
        <header className="ui-surface flex flex-wrap items-start justify-between gap-4 rounded-2xl border-l-4 border-l-[var(--accent)] p-5">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              <CalendarDays className="h-3.5 w-3.5" /> Planning · V2
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Vues synchronisées</h1>
            <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
              Semaine, mois, timeline et charge sur une même donnée, avec détection de conflits.
            </p>
          </div>
          {conflicts.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-800">
              <ShieldAlert className="h-4 w-4" /> {conflicts.length} conflit(s)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800">
              Aucun conflit
            </span>
          )}
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav className="flex items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-1">
            {[
              { id: "week" as const, label: "Semaine", icon: LayoutGrid },
              { id: "month" as const, label: "Mois", icon: CalendarDays },
              { id: "timeline" as const, label: "Timeline", icon: GanttChartSquare },
              { id: "workload" as const, label: "Charge", icon: Scale },
            ].map((v) => {
              const Icon = v.icon;
              const active = view === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setView(v.id)}
                  className={[
                    "ui-transition inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold",
                    active ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "text-[color:var(--foreground)]/60 hover:bg-[var(--surface)]",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  {v.label}
                </button>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="ui-transition flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-soft)]"
              aria-label="Précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[160px] text-center text-sm font-semibold capitalize text-[var(--foreground)]">
              {rangeLabel}
            </span>
            <button
              type="button"
              onClick={() => navigate(1)}
              className="ui-transition flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-soft)]"
              aria-label="Suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {view === "week" ? (
          <section className="ui-surface overflow-x-auto rounded-2xl p-4">
            <div className="grid min-w-[840px] grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const dayTasks = tasksForDay(day);
                const today = isSameDay(day, new Date());
                return (
                  <div key={day.toISOString()} className="rounded-xl border border-[var(--line)] bg-[var(--surface)]">
                    <div className={`rounded-t-xl px-3 py-2 text-center text-xs font-semibold ${today ? "bg-[var(--accent-soft)] text-[var(--accent)]" : "text-[color:var(--foreground)]/60"}`}>
                      {format(day, "EEE d", { locale: fr })}
                    </div>
                    <div className="space-y-1.5 p-2">
                      {dayTasks.length === 0 ? (
                        <p className="py-3 text-center text-[10px] text-[color:var(--foreground)]/35">—</p>
                      ) : (
                        dayTasks.map((t) => (
                          <div key={t.id} className="rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[t.priority] ?? "bg-slate-400"}`} />
                              <p className="truncate text-[11px] font-semibold text-[var(--foreground)]">{t.projectName}</p>
                            </div>
                            <p className="mt-0.5 truncate text-[10px] text-[color:var(--foreground)]/50">
                              {t.admins[0] ?? "Non assigné"}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {view === "month" ? (
          <section className="ui-surface rounded-2xl p-4">
            <div className="grid grid-cols-7 gap-1">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                <div key={d} className="pb-1 text-center text-[11px] font-semibold uppercase text-[color:var(--foreground)]/45">
                  {d}
                </div>
              ))}
              {monthDays.map((day) => {
                const dayTasks = tasksForDay(day);
                const inMonth = day.getMonth() === anchor.getMonth();
                const today = isSameDay(day, new Date());
                return (
                  <div
                    key={day.toISOString()}
                    className={[
                      "min-h-[92px] rounded-lg border p-1.5",
                      inMonth ? "border-[var(--line)] bg-[var(--surface)]" : "border-transparent bg-[var(--surface-soft)]/40 opacity-50",
                    ].join(" ")}
                  >
                    <div className={`text-right text-[11px] font-semibold ${today ? "text-[var(--accent)]" : "text-[color:var(--foreground)]/50"}`}>
                      {format(day, "d")}
                    </div>
                    <div className="mt-1 space-y-1">
                      {dayTasks.slice(0, 3).map((t) => (
                        <div key={t.id} className="flex items-center gap-1 truncate rounded bg-[var(--accent-soft)] px-1 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[t.priority] ?? "bg-slate-400"}`} />
                          <span className="truncate">{t.projectName}</span>
                        </div>
                      ))}
                      {dayTasks.length > 3 ? (
                        <p className="text-[10px] text-[color:var(--foreground)]/45">+{dayTasks.length - 3}</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {view === "timeline" ? (
          <section className="ui-surface overflow-x-auto rounded-2xl p-4">
            {timelineTasks.length === 0 ? (
              <p className="py-8 text-center text-sm text-[color:var(--foreground)]/55">Aucune tâche datée sur ce mois.</p>
            ) : (
              <div className="min-w-[720px] space-y-1.5">
                <div className="flex items-center gap-2 border-b border-[var(--line)] pb-1 text-[10px] text-[color:var(--foreground)]/45">
                  <span className="w-48 shrink-0">Tâche</span>
                  <span className="flex-1">{format(timelineStart, "MMMM yyyy", { locale: fr })}</span>
                </div>
                {timelineTasks.map(({ task, start, end }) => {
                  const startOffset = Math.max(0, (start.getDate() - 1) / totalDays) * 100;
                  const spanDays = Math.max(1, end.getDate() - start.getDate() + 1);
                  const width = Math.min(100 - startOffset, (spanDays / totalDays) * 100);
                  return (
                    <div key={task.id} className="flex items-center gap-2">
                      <span className="w-48 shrink-0 truncate text-[11px] font-semibold text-[var(--foreground)]">{task.projectName}</span>
                      <div className="relative h-5 flex-1 rounded bg-[var(--surface-soft)]">
                        <div
                          className="absolute top-0 flex h-5 items-center rounded bg-[var(--accent)] px-1.5 text-[9px] font-semibold text-[var(--accent-contrast)]"
                          style={{ left: `${startOffset}%`, width: `${width}%` }}
                          title={`${format(start, "d MMM", { locale: fr })} → ${format(end, "d MMM", { locale: fr })}`}
                        >
                          <span className="truncate">{task.admins[0] ?? ""}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

        {view === "workload" ? (
          <section className="ui-surface overflow-x-auto rounded-2xl p-4">
            {workload.length === 0 ? (
              <p className="py-8 text-center text-sm text-[color:var(--foreground)]/55">Aucune charge planifiée.</p>
            ) : (
              <table className="w-full min-w-[840px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-left text-[11px] uppercase text-[color:var(--foreground)]/45">Personne</th>
                    {weekDays.map((day) => (
                      <th key={day.toISOString()} className="px-1 py-2 text-center text-[11px] font-semibold text-[color:var(--foreground)]/55">
                        {format(day, "EEE d", { locale: fr })}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {workload.map((p) => (
                    <tr key={p.person} className="border-t border-[var(--line)]">
                      <td className="px-2 py-2 text-sm font-semibold text-[var(--foreground)]">{p.person}</td>
                      {weekDays.map((day) => {
                        const key = format(day, "yyyy-MM-dd");
                        const load = p.byDate.get(key)?.hours ?? 0;
                        const ratio = Math.min(1.5, load / DAILY_CAPACITY_HOURS);
                        const over = load > DAILY_CAPACITY_HOURS + 0.01;
                        return (
                          <td key={key} className="px-1 py-1.5 text-center">
                            <div
                              className={[
                                "mx-auto flex h-9 w-full max-w-[64px] items-center justify-center rounded-lg text-[11px] font-bold",
                                load === 0 ? "text-[color:var(--foreground)]/25" : over ? "text-white" : "text-[var(--foreground)]",
                              ].join(" ")}
                              style={{
                                backgroundColor:
                                  load === 0
                                    ? "var(--surface-soft)"
                                    : over
                                      ? "var(--danger)"
                                      : `color-mix(in srgb, var(--accent) ${Math.round(ratio * 55)}%, var(--surface))`,
                              }}
                              title={`${load.toFixed(1)} h`}
                            >
                              {load === 0 ? "·" : `${load.toFixed(1)}`}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        ) : null}

        {conflicts.length > 0 ? (
          <section className="ui-surface rounded-2xl p-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
              <AlertTriangle className="h-4 w-4 text-[var(--danger)]" /> Conflits &amp; rééquilibrage
            </h2>
            <ul className="space-y-2">
              {conflicts.map((c) => (
                <li key={c.id} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
                  <div className="flex items-start gap-2">
                    <span
                      className={[
                        "mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        c.kind === "overload" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800",
                      ].join(" ")}
                    >
                      {c.kind === "overload" ? "Surcharge" : "Chevauchement"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--foreground)]">{c.message}</p>
                      <p className="mt-0.5 text-[12px] text-[var(--accent)]">💡 {c.suggestion}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
  );
}
