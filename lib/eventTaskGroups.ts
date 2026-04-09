import type { Task } from "./types";

export function sortTasksByDeadline(a: Task, b: Task) {
  const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
  const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
  return da - db;
}

/** Tâches sans salon en liste plate ; tâches événement regroupées par `eventId`. */
export function partitionTasksByEvent(tasks: Task[]) {
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
  standalone.sort(sortTasksByDeadline);
  const entries = Array.from(groups.entries()).sort(([idA, listA], [idB, listB]) => {
    const nameA = listA[0]?.eventName ?? idA;
    const nameB = listB[0]?.eventName ?? idB;
    return String(nameA).localeCompare(String(nameB), "fr");
  });
  for (const [, list] of entries) {
    list.sort(sortTasksByDeadline);
  }
  return { standalone, groups: entries };
}
