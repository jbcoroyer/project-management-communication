import type { Task } from "./types";

export function sortTasksByDeadline(a: Task, b: Task) {
  const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
  const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
  return da - db;
}

export type SalonTaskGroup = {
  groupId: string;
  /** Lien fiche salon v3 si dispo, sinon ancien event. */
  href: string;
  title: string;
  tasks: Task[];
};

/** Tâches hors salon en liste plate ; tâches liées salon/event regroupées. */
export function partitionTasksByEvent(tasks: Task[]) {
  const standalone: Task[] = [];
  const groups = new Map<string, SalonTaskGroup>();

  for (const t of tasks) {
    const salonId = t.salonId;
    const eventId = t.eventId;
    if (!salonId && !eventId) {
      standalone.push(t);
      continue;
    }
    const groupId = salonId ? `salon:${salonId}` : `event:${eventId}`;
    const existing = groups.get(groupId);
    if (existing) {
      existing.tasks.push(t);
    } else {
      groups.set(groupId, {
        groupId,
        href: salonId ? `/v3/salons/${salonId}` : `/v3/salons`,
        title: t.salonName ?? t.eventName ?? "Salon",
        tasks: [t],
      });
    }
  }

  standalone.sort(sortTasksByDeadline);
  const entries = Array.from(groups.values()).sort((a, b) =>
    a.title.localeCompare(b.title, "fr"),
  );
  for (const g of entries) {
    g.tasks.sort(sortTasksByDeadline);
  }

  /** Compat Kanban : [id, tasks][] — id = salon uuid ou event uuid. */
  const legacyEntries: Array<[string, Task[]]> = entries.map((g) => {
    const rawId = g.groupId.includes(":") ? g.groupId.split(":")[1]! : g.groupId;
    return [rawId, g.tasks];
  });

  return { standalone, groups: legacyEntries, salonGroups: entries };
}
