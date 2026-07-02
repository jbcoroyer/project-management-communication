import type { Task } from "../types";
import { DONE_COLUMN_NAME } from "../workflowConstants";

export type PlanBlock = {
  taskId: string | null;
  title: string;
  start: string; // "HH:MM"
  end: string;
  kind: "task" | "break" | "focus";
  reason: string;
  priorityScore: number;
};

export type PlannerConfig = {
  dayStart: string; // "09:00"
  dayEnd: string; // "18:00"
  lunchStart: string; // "12:30"
  lunchMinutes: number;
  maxBlockMinutes: number;
  minBlockMinutes: number;
};

export const DEFAULT_PLANNER_CONFIG: PlannerConfig = {
  dayStart: "09:00",
  dayEnd: "18:00",
  lunchStart: "12:30",
  lunchMinutes: 60,
  maxBlockMinutes: 120,
  minBlockMinutes: 30,
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function isSameDay(dateStr: string, ref: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

/** Score de priorité d'une tâche pour l'ordonnancement du jour. */
function scoreTask(task: Task, now: Date): number {
  let score = 0;
  const deadlineTs = task.deadline ? new Date(task.deadline).getTime() : null;
  const nowTs = now.getTime();
  if (deadlineTs !== null) {
    if (deadlineTs < nowTs) score += 100; // en retard
    else {
      const daysLeft = (deadlineTs - nowTs) / (24 * 60 * 60 * 1000);
      if (daysLeft <= 1) score += 60;
      else if (daysLeft <= 3) score += 35;
      else if (daysLeft <= 7) score += 15;
    }
  }
  if (task.priority === "Haute") score += 30;
  else if (task.priority === "Moyenne") score += 12;
  if (task.column === "En cours") score += 20;
  if (task.column === "En validation") score += 8;
  // Créneau explicitement planifié aujourd'hui.
  if (task.projectedWork.some((p) => isSameDay(p.date, now))) score += 25;
  return score;
}

function blockMinutesFor(task: Task, config: PlannerConfig): number {
  const todaySlot = task.projectedWork.find((p) => p.hours > 0);
  const hours = todaySlot?.hours ?? task.estimatedHours ?? 1;
  const raw = Math.round((hours || 1) * 60);
  return Math.min(config.maxBlockMinutes, Math.max(config.minBlockMinutes, raw));
}

/**
 * Construit un agenda du jour « time-blocké » à partir des tâches de l'utilisateur.
 * Déterministe : exploite deadlines, priorités, estimations et projectedWork.
 */
export function buildDayPlan(
  tasks: Task[],
  currentUserName: string | null | undefined,
  now: Date = new Date(),
  config: PlannerConfig = DEFAULT_PLANNER_CONFIG,
): PlanBlock[] {
  const me = currentUserName?.trim().toLowerCase();
  const candidates = tasks
    .filter((t) => {
      if (t.isArchived || t.parentTaskId) return false;
      if (t.column === DONE_COLUMN_NAME) return false;
      if (!me) return false;
      return t.admins.some((a) => a.trim().toLowerCase() === me);
    })
    .map((t) => ({ task: t, score: scoreTask(t, now) }))
    .sort((a, b) => b.score - a.score);

  const blocks: PlanBlock[] = [];
  let cursor = toMinutes(config.dayStart);
  const dayEnd = toMinutes(config.dayEnd);
  const lunchStart = toMinutes(config.lunchStart);
  let lunchInserted = false;

  const insertLunchIfNeeded = (nextDuration: number) => {
    if (lunchInserted) return;
    if (cursor <= lunchStart && cursor + nextDuration > lunchStart) {
      blocks.push({
        taskId: null,
        title: "Pause déjeuner",
        start: toHHMM(lunchStart),
        end: toHHMM(lunchStart + config.lunchMinutes),
        kind: "break",
        reason: "Coupure planifiée",
        priorityScore: 0,
      });
      cursor = lunchStart + config.lunchMinutes;
      lunchInserted = true;
    }
  };

  for (const { task, score } of candidates) {
    if (cursor >= dayEnd) break;
    const duration = blockMinutesFor(task, config);
    insertLunchIfNeeded(duration);
    if (cursor >= dayEnd) break;
    const end = Math.min(dayEnd, cursor + duration);
    if (end - cursor < config.minBlockMinutes) break;

    const deadlineTs = task.deadline ? new Date(task.deadline).getTime() : null;
    let reason = "Priorité du jour";
    if (deadlineTs !== null && deadlineTs < now.getTime()) reason = "En retard — à traiter en priorité";
    else if (task.priority === "Haute") reason = "Priorité haute";
    else if (task.column === "En cours") reason = "Déjà en cours";
    else if (task.projectedWork.some((p) => isSameDay(p.date, now))) reason = "Planifié aujourd'hui";

    blocks.push({
      taskId: task.id,
      title: task.projectName || "Tâche sans titre",
      start: toHHMM(cursor),
      end: toHHMM(end),
      kind: "task",
      reason,
      priorityScore: score,
    });
    cursor = end;
  }

  // Reliquat de journée → bloc focus/rattrapage.
  if (cursor < dayEnd && blocks.length > 0) {
    blocks.push({
      taskId: null,
      title: "Temps tampon / imprévus",
      start: toHHMM(cursor),
      end: toHHMM(dayEnd),
      kind: "focus",
      reason: "Marge pour les imprévus et le suivi",
      priorityScore: 0,
    });
  }

  return blocks;
}
