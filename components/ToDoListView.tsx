"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  UserCircle2,
} from "lucide-react";
import type { Task, AdminId } from "../lib/types";
import { adminBadgeClassFor } from "../lib/kanbanStyles";
import {
  loadCollapsedEventGroupIds,
  persistCollapsedEventGroupIds,
  toggleCollapsedEventGroup,
} from "../lib/eventGroupCollapse";
import { partitionTasksByEvent } from "../lib/eventTaskGroups";

/** Colonnes qui apparaissent dans la To-Do List */
const TODO_COLUMNS = new Set(["En cours", "À faire", "En validation", "Backlog"]);

/** Catégories deadline (ordre d'affichage) */
type DeadlineCategory = "overdue" | "today" | "week" | "month" | "later";

const CATEGORY_META: Record<
  DeadlineCategory,
  { label: string; emoji: string; accentClass: string; borderClass: string; bgClass: string }
> = {
  overdue: {
    label: "En retard",
    emoji: "🔴",
    accentClass: "bg-rose-500",
    borderClass: "border-rose-200",
    bgClass: "bg-rose-50/60",
  },
  today: {
    label: "Aujourd'hui",
    emoji: "🟠",
    accentClass: "bg-orange-400",
    borderClass: "border-orange-200",
    bgClass: "bg-orange-50/60",
  },
  week: {
    label: "Cette semaine",
    emoji: "🟡",
    accentClass: "bg-amber-400",
    borderClass: "border-amber-200",
    bgClass: "bg-amber-50/30",
  },
  month: {
    label: "Ce mois",
    emoji: "🔵",
    accentClass: "bg-blue-400",
    borderClass: "border-blue-200",
    bgClass: "bg-blue-50/20",
  },
  later: {
    label: "Plus tard",
    emoji: "⚪",
    accentClass: "bg-slate-300",
    borderClass: "border-[var(--line)]",
    bgClass: "",
  },
};

function getDeadlineCategory(deadline: string | undefined, now: number): DeadlineCategory {
  if (!deadline) return "later";
  const endOfDay = new Date(deadline + "T23:59:59").getTime();
  const diffMs = endOfDay - now;

  if (diffMs < 0) return "overdue";

  const today = new Date(now);
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).getTime();
  if (endOfDay <= endOfToday) return "today";

  if (diffMs <= 7 * 24 * 60 * 60 * 1000) return "week";
  if (diffMs <= 31 * 24 * 60 * 60 * 1000) return "month";
  return "later";
}

function TodoTaskRow(props: {
  task: Task;
  cat: DeadlineCategory;
  onTaskClick?: (task: Task) => void;
}) {
  const { task, cat, onTaskClick } = props;
  const meta = CATEGORY_META[cat];
  const isOverdue = cat === "overdue";
  const isToday = cat === "today";
  const isUrgent = isOverdue || isToday;
  const subtaskCount = task.subtasks?.length ?? 0;
  const doneCount = task.subtasks?.filter((s) => s.column === "Terminé").length ?? 0;

  return (
    <button
      type="button"
      onClick={() => onTaskClick?.(task)}
      className={[
        "group w-full flex items-center gap-3 rounded-xl border bg-[var(--surface)] px-4 py-3 text-left transition hover:shadow-[0_6px_20px_rgba(20,17,13,0.10)]",
        isOverdue
          ? "border-rose-200 bg-rose-50/40 hover:border-rose-300"
          : isToday
            ? "border-orange-200 bg-orange-50/30 hover:border-orange-300"
            : "border-[var(--line)] hover:border-[var(--line-strong)]",
        !onTaskClick ? "cursor-default" : "cursor-pointer",
      ].join(" ")}
    >
      <div className={["h-9 w-1 shrink-0 rounded-full", meta.accentClass].join(" ")} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--foreground)]">
          {task.projectName || "Projet sans titre"}
        </p>
        <div className="mt-0.5 flex items-center gap-2">
          {task.description && (
            <p className="truncate text-xs text-[color:var(--foreground)]/50 max-w-[200px]">{task.description}</p>
          )}
          {subtaskCount > 0 && (
            <span className="shrink-0 rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--foreground)]/55">
              {doneCount}/{subtaskCount} étapes
            </span>
          )}
        </div>
      </div>

      <span className="hidden items-center rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1 text-[11px] text-[color:var(--foreground)]/65 sm:inline-flex">
        {task.column}
      </span>

      <span className="hidden items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1 text-[11px] text-[color:var(--foreground)]/65 md:inline-flex">
        <Building2 className="h-3 w-3 shrink-0" />
        <span className="max-w-[80px] truncate">{task.company}</span>
      </span>

      {task.deadline && (
        <span
          className={[
            "hidden items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium sm:inline-flex",
            isOverdue
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : isToday
                ? "border-orange-200 bg-orange-50 text-orange-700"
                : "border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/65",
          ].join(" ")}
        >
          <CalendarDays className="h-3 w-3 shrink-0" />
          <span>{task.deadline}</span>
          {isUrgent && <span className="ml-0.5">⚠</span>}
        </span>
      )}

      {onTaskClick && (
        <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--foreground)]/30 transition group-hover:translate-x-0.5 group-hover:text-[color:var(--foreground)]/50" />
      )}
    </button>
  );
}

export default function ToDoListView(props: {
  tasks: Task[];
  now: number;
  admins: string[];
  currentUserName?: string | null;
  onTaskClick?: (task: Task) => void;
}) {
  const [manualSelectedAdmin, setManualSelectedAdmin] = useState<AdminId>("");
  const [collapsedEventIds, setCollapsedEventIds] = useState<Set<string>>(() => loadCollapsedEventGroupIds());

  const toggleEventGroupCollapse = (eventId: string) => {
    setCollapsedEventIds((prev) => {
      const next = toggleCollapsedEventGroup(prev, eventId);
      persistCollapsedEventGroupIds(next);
      return next;
    });
  };

  const isAutoDetected = Boolean(props.currentUserName);
  const preferredAdmin = useMemo(
    () =>
      ((props.currentUserName && props.admins.includes(props.currentUserName)
        ? props.currentUserName
        : null) ?? props.admins[0] ?? "") as AdminId,
    [props.admins, props.currentUserName],
  );
  const selectedAdmin = useMemo<AdminId>(() => {
    if (isAutoDetected) return preferredAdmin;
    if (manualSelectedAdmin && props.admins.includes(manualSelectedAdmin)) return manualSelectedAdmin;
    return preferredAdmin;
  }, [isAutoDetected, manualSelectedAdmin, preferredAdmin, props.admins]);

  const visibleTasks = useMemo(() => {
    return props.tasks.filter(
      (task) =>
        !task.isArchived &&
        !task.parentTaskId &&
        task.admins.includes(selectedAdmin) &&
        TODO_COLUMNS.has(task.column) &&
        task.column !== "Terminé",
    );
  }, [props.tasks, selectedAdmin]);

  // Groupement par catégorie deadline puis tri par deadline dans chaque catégorie
  const grouped = useMemo<Record<DeadlineCategory, Task[]>>(() => {
    const map: Record<DeadlineCategory, Task[]> = {
      overdue: [],
      today: [],
      week: [],
      month: [],
      later: [],
    };
    for (const task of visibleTasks) {
      const cat = getDeadlineCategory(task.deadline, props.now);
      map[cat].push(task);
    }
    const sortByDeadline = (a: Task, b: Task) => {
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    };
    for (const cat of Object.keys(map) as DeadlineCategory[]) {
      map[cat].sort(sortByDeadline);
    }
    return map;
  }, [visibleTasks, props.now]);

  const categories = (Object.keys(CATEGORY_META) as DeadlineCategory[]).filter(
    (cat) => grouped[cat].length > 0,
  );

  return (
    <div className="space-y-6">
      {/* En-tête : identité + sélecteur */}
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="flex items-center gap-2">
          <UserCircle2 className="h-5 w-5 text-[color:var(--foreground)]/50" />
          {isAutoDetected ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/55">
                Connecté en tant que
              </p>
              <p className="text-sm font-semibold text-[var(--foreground)]">{selectedAdmin}</p>
            </div>
          ) : (
            <p className="whitespace-nowrap text-sm font-semibold text-[color:var(--foreground)]/70">
              Quel collaborateur êtes-vous ?
            </p>
          )}
        </div>

        {!isAutoDetected && (
          <div className="flex flex-wrap gap-2">
            {props.admins.map((admin) => (
              <button
                key={admin}
                type="button"
                onClick={() => setManualSelectedAdmin(admin)}
                className={[
                  "ui-transition inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold transition",
                  selectedAdmin === admin
                    ? adminBadgeClassFor(admin)
                    : "border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/60 hover:bg-[var(--surface)]",
                ].join(" ")}
              >
                {admin}
              </button>
            ))}
          </div>
        )}

        <span className="ml-auto rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-2.5 py-1.5 text-[11px] font-semibold text-[color:var(--foreground)]/55">
          {visibleTasks.length} tâche{visibleTasks.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Catégories */}
      {categories.map((cat) => {
        const meta = CATEGORY_META[cat];
        const catTasks = grouped[cat];

        return (
          <section key={cat}>
            <div className="mb-3 flex items-center gap-2.5">
              <span className="text-base leading-none">{meta.emoji}</span>
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/80">
                {meta.label}
              </h2>
              <span className="ml-auto rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--foreground)]/60">
                {catTasks.length}
              </span>
            </div>

            <div className="space-y-1.5">
              {(() => {
                const { standalone, groups } = partitionTasksByEvent(catTasks);
                return (
                  <>
                    {standalone.map((task) => (
                      <TodoTaskRow key={task.id} task={task} cat={cat} onTaskClick={props.onTaskClick} />
                    ))}
                    {groups.map(([eventId, evTasks]) => {
                      const collapsed = collapsedEventIds.has(eventId);
                      return (
                        <div
                          key={eventId}
                          className="overflow-hidden rounded-xl border border-[var(--line)]/85 bg-[var(--surface-soft)]"
                        >
                          <div className="flex items-center gap-2 px-2 py-2">
                            <button
                              type="button"
                              onClick={() => toggleEventGroupCollapse(eventId)}
                              className="ui-transition flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[color:var(--foreground)]/55 hover:bg-[var(--surface-soft)] hover:text-[color:var(--foreground)]/75"
                              title={collapsed ? "Afficher les tâches du salon" : "Masquer les tâches (nom du salon seulement)"}
                              aria-expanded={!collapsed}
                            >
                              {collapsed ? (
                                <ChevronRight className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                            <div className="flex min-w-0 flex-1 items-center gap-1.5">
                              <CalendarRange className="h-3.5 w-3.5 shrink-0 text-[color:var(--foreground)]/75" />
                              <span className="truncate text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--foreground)]/75">
                                {evTasks[0]?.eventName ?? "Événement"}
                              </span>
                              <span className="ml-auto shrink-0 rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--foreground)]/55">
                                {evTasks.length}
                              </span>
                            </div>
                          </div>
                          {!collapsed && (
                            <div className="space-y-1.5 border-t border-[var(--line)]/80 px-2 pb-2 pt-1.5">
                              {evTasks.map((task) => (
                                <TodoTaskRow key={task.id} task={task} cat={cat} onTaskClick={props.onTaskClick} />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          </section>
        );
      })}

      {visibleTasks.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--line)] py-14 text-center">
          <p className="text-sm text-[color:var(--foreground)]/45">
            Aucune tâche active pour {selectedAdmin} pour le moment.
          </p>
          <p className="mt-1 text-xs text-[color:var(--foreground)]/30">
            Les tâches &apos;Terminé&apos; sont masquées dans cette vue.
          </p>
        </div>
      )}
    </div>
  );
}
