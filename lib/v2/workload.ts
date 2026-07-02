import type { Task } from "../types";
import { DONE_COLUMN_NAME } from "../workflowConstants";

export const DAILY_CAPACITY_HOURS = 7;

export type DayLoad = {
  date: string; // YYYY-MM-DD
  hours: number;
  taskIds: string[];
};

export type PersonLoad = {
  person: string;
  totalHours: number;
  byDate: Map<string, DayLoad>;
};

/** Agrège la charge (projectedWork, sinon estimation répartie sur la deadline) par personne et par jour. */
export function buildWorkload(tasks: Task[]): PersonLoad[] {
  const map = new Map<string, PersonLoad>();

  const ensure = (person: string): PersonLoad => {
    let p = map.get(person);
    if (!p) {
      p = { person, totalHours: 0, byDate: new Map() };
      map.set(person, p);
    }
    return p;
  };

  const addLoad = (person: string, date: string, hours: number, taskId: string) => {
    if (hours <= 0) return;
    const p = ensure(person);
    let day = p.byDate.get(date);
    if (!day) {
      day = { date, hours: 0, taskIds: [] };
      p.byDate.set(date, day);
    }
    day.hours += hours;
    if (!day.taskIds.includes(taskId)) day.taskIds.push(taskId);
    p.totalHours += hours;
  };

  for (const task of tasks) {
    if (task.isArchived || task.parentTaskId) continue;
    if (task.column === DONE_COLUMN_NAME) continue;
    const assignees = task.admins.filter(Boolean);
    if (assignees.length === 0) continue;

    const slots = task.projectedWork.filter((p) => p.date && p.hours > 0);
    for (const person of assignees) {
      if (slots.length > 0) {
        for (const slot of slots) {
          addLoad(person, slot.date.slice(0, 10), slot.hours / assignees.length, task.id);
        }
      } else if (task.deadline) {
        // Pas de créneau : on impute l'estimation le jour de l'échéance.
        addLoad(person, task.deadline.slice(0, 10), (task.estimatedHours || 1) / assignees.length, task.id);
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.totalHours - a.totalHours);
}

export type Conflict = {
  id: string;
  kind: "overload" | "overlap";
  person: string;
  date: string;
  hours?: number;
  taskIds: string[];
  message: string;
  suggestion: string;
};

function toMin(hhmm?: string): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  return h * 60 + (m || 0);
}

/** Détecte surcharges journalières et chevauchements de créneaux, avec pistes de rééquilibrage. */
export function detectConflicts(
  tasks: Task[],
  workload: PersonLoad[],
  capacity = DAILY_CAPACITY_HOURS,
): Conflict[] {
  const conflicts: Conflict[] = [];

  // Surcharges journalières.
  for (const p of workload) {
    for (const day of p.byDate.values()) {
      if (day.hours > capacity + 0.01) {
        const under = workload
          .filter((o) => o.person !== p.person)
          .map((o) => ({ person: o.person, hours: o.byDate.get(day.date)?.hours ?? 0 }))
          .filter((o) => o.hours < capacity)
          .sort((a, b) => a.hours - b.hours)[0];
        conflicts.push({
          id: `overload-${p.person}-${day.date}`,
          kind: "overload",
          person: p.person,
          date: day.date,
          hours: day.hours,
          taskIds: day.taskIds,
          message: `${p.person} est surchargé le ${new Date(day.date).toLocaleDateString("fr-FR")} (${day.hours.toFixed(1)} h / ${capacity} h)`,
          suggestion: under
            ? `Déléguer une tâche à ${under.person} (${under.hours.toFixed(1)} h ce jour) ou reporter d'un jour.`
            : "Reporter une tâche à un autre jour : aucun collègue disponible ce jour-là.",
        });
      }
    }
  }

  // Chevauchements de créneaux horaires (même personne, même jour).
  const byPersonDay = new Map<string, { task: Task; start: number; end: number }[]>();
  for (const task of tasks) {
    if (task.isArchived || task.parentTaskId || task.column === DONE_COLUMN_NAME) continue;
    for (const slot of task.projectedWork) {
      const start = toMin(slot.startTime);
      const end = toMin(slot.endTime);
      if (start === null || end === null || end <= start) continue;
      for (const person of task.admins.filter(Boolean)) {
        const key = `${person}|${slot.date.slice(0, 10)}`;
        const arr = byPersonDay.get(key) ?? [];
        arr.push({ task, start, end });
        byPersonDay.set(key, arr);
      }
    }
  }

  for (const [key, slots] of byPersonDay) {
    if (slots.length < 2) continue;
    const [person, date] = key.split("|");
    const sorted = slots.sort((a, b) => a.start - b.start);
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i].start < sorted[i - 1].end) {
        conflicts.push({
          id: `overlap-${person}-${date}-${i}`,
          kind: "overlap",
          person,
          date,
          taskIds: [sorted[i - 1].task.id, sorted[i].task.id],
          message: `Créneaux qui se chevauchent pour ${person} le ${new Date(date).toLocaleDateString("fr-FR")} : « ${sorted[i - 1].task.projectName} » et « ${sorted[i].task.projectName} »`,
          suggestion: "Décaler l'un des deux créneaux pour éviter le double-booking.",
        });
      }
    }
  }

  return conflicts;
}
