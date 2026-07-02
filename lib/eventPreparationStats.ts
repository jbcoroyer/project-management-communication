import type { Task } from "./types";

export type EventPreparationStats = {
  totalTasks: number;
  doneTasks: number;
  progressPct: number;
  overdueTasks: number;
  unscheduledOpen: number;
};

export function computeEventPreparationStats(eventId: string, tasks: Task[]): EventPreparationStats {
  const today = new Date().toISOString().slice(0, 10);
  const eventTasks = tasks.filter((t) => t.eventId === eventId && !t.isArchived);
  const totalTasks = eventTasks.length;
  const doneTasks = eventTasks.filter((t) => t.column === "Terminé").length;
  const overdueTasks = eventTasks.filter(
    (t) => t.column !== "Terminé" && t.deadline && t.deadline < today,
  ).length;
  const unscheduledOpen = eventTasks.filter(
    (t) => t.column !== "Terminé" && !t.deadline?.trim(),
  ).length;
  const progressPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return {
    totalTasks,
    doneTasks,
    progressPct,
    overdueTasks,
    unscheduledOpen,
  };
}
