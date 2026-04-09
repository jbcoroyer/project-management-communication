"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CalendarRange, ListTodo } from "lucide-react";
import { defaultColumns } from "../../lib/types";
import type { Task } from "../../lib/types";

type EventTasksKanbanProps = {
  tasks: Task[];
};

function sortByDeadline(a: Task, b: Task) {
  const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
  const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
  return da - db;
}

function partitionByEvent(tasks: Task[]) {
  const standalone: Task[] = [];
  const groups = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!t.eventId) {
      standalone.push(t);
    } else {
      const arr = groups.get(t.eventId) ?? [];
      arr.push(t);
      groups.set(t.eventId, arr);
    }
  }
  standalone.sort(sortByDeadline);
  const entries = Array.from(groups.entries()).sort(([idA, listA], [idB, listB]) => {
    const nameA = listA[0]?.eventName ?? idA;
    const nameB = listB[0]?.eventName ?? idB;
    return String(nameA).localeCompare(String(nameB), "fr");
  });
  for (const [, list] of entries) list.sort(sortByDeadline);
  return { standalone, groups: entries };
}

export default function EventTasksKanban(props: EventTasksKanbanProps) {
  const { tasks } = props;

  const byColumn = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const col of defaultColumns) {
      map[col] = [];
    }
    for (const t of tasks) {
      const col = defaultColumns.includes(t.column as (typeof defaultColumns)[number]) ? t.column : defaultColumns[0];
      if (!map[col]) map[col] = [];
      map[col].push(t);
    }
    return map;
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-12 text-center text-sm text-[color:var(--foreground)]/55">
        Aucune tâche liée à un événement. Créez un salon pour générer la checklist.
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {defaultColumns.map((col) => (
        <div key={col} className="flex min-w-[240px] flex-1 flex-col rounded-2xl border border-[var(--line)] bg-[var(--surface)]/80">
          <div className="border-b border-[var(--line)] px-3 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color:var(--foreground)]/55">{col}</p>
            <p className="text-xs text-[color:var(--foreground)]/45">{byColumn[col]?.length ?? 0} tâche(s)</p>
          </div>
          <div className="flex flex-col gap-2 p-2">
            {(() => {
              const colList = [...(byColumn[col] ?? [])].sort(sortByDeadline);
              const { standalone, groups } = partitionByEvent(colList);
              if (colList.length === 0) {
                return (
                  <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--line)] py-8 text-xs text-[color:var(--foreground)]/40">
                    <ListTodo className="h-4 w-4" />
                    Vide
                  </div>
                );
              }
              return (
                <>
                  {standalone.map((task) => (
                    <Link
                      key={task.id}
                      href={task.eventId ? `/events/${task.eventId}` : "#"}
                      className="ui-transition rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2.5 text-left hover:border-[var(--line)]/90 hover:bg-[var(--surface-soft)]"
                    >
                      <p className="text-sm font-semibold leading-snug text-[var(--foreground)]">{task.projectName}</p>
                      {task.eventCategory && (
                        <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[color:var(--foreground)]/45">
                          {task.eventCategory}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-[color:var(--foreground)]/50">
                        {task.admins[0] && <span>{task.admins[0]}</span>}
                        {task.deadline && <span>· {task.deadline}</span>}
                      </div>
                    </Link>
                  ))}
                  {groups.map(([eventId, evTasks]) => (
                    <div
                      key={eventId}
                      className="space-y-2 rounded-xl border border-[var(--line)]/85 bg-[var(--surface-soft)] p-2"
                    >
                      <Link
                        href={`/events/${eventId}`}
                        className="flex items-center justify-between gap-2 px-1 pb-0.5 pt-0.5 text-left"
                      >
                        <span className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[color:var(--foreground)]/75 hover:underline">
                          <CalendarRange className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{evTasks[0]?.eventName ?? "Événement"}</span>
                        </span>
                        <span className="shrink-0 text-[10px] font-semibold text-[color:var(--foreground)]/45">
                          {evTasks.length}
                        </span>
                      </Link>
                      {evTasks.map((task) => (
                        <Link
                          key={task.id}
                          href={`/events/${eventId}`}
                          className="ui-transition block rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2.5 text-left hover:border-[var(--line)]/90 hover:bg-[var(--surface-soft)]"
                        >
                          <p className="text-sm font-semibold leading-snug text-[var(--foreground)]">{task.projectName}</p>
                          {task.eventCategory && (
                            <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[color:var(--foreground)]/45">
                              {task.eventCategory}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-[color:var(--foreground)]/50">
                            {task.admins[0] && <span>{task.admins[0]}</span>}
                            {task.deadline && <span>· {task.deadline}</span>}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        </div>
      ))}
    </div>
  );
}
