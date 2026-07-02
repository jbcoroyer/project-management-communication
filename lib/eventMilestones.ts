import type { Task } from "./types";

const EVENT_MILESTONE_OFFSETS = [60, 30, 14, 7, 1, 0, -7] as const;

export type MilestoneOffset = (typeof EVENT_MILESTONE_OFFSETS)[number];

export type MilestoneStatus = "done" | "current" | "upcoming" | "late";

export type EventMilestone = {
  offset: MilestoneOffset;
  label: string;
  dateIso: string;
  status: MilestoneStatus;
  openTasksDueBy: number;
};

function addDays(isoDate: string, delta: number): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function milestoneLabel(offset: MilestoneOffset): string {
  if (offset === 0) return "Jour J";
  if (offset > 0) return `J-${offset}`;
  return `J+${Math.abs(offset)}`;
}

export function buildEventMilestones(
  startDate: string,
  endDate: string,
  tasks: Task[],
): EventMilestone[] {
  const today = new Date().toISOString().slice(0, 10);
  const eventTasks = tasks.filter((t) => !t.isArchived);

  return EVENT_MILESTONE_OFFSETS.map((offset) => {
    const dateIso = addDays(startDate, -offset);
    let status: MilestoneStatus = "upcoming";
    if (dateIso < today) status = "done";
    else if (dateIso === today) status = "current";
    if (status === "done" && offset >= 0 && endDate >= today) {
      const open = eventTasks.filter(
        (t) =>
          t.column !== "Terminé" &&
          t.deadline &&
          t.deadline <= dateIso,
      ).length;
      if (open > 0) status = "late";
    }

    const openTasksDueBy = eventTasks.filter(
      (t) =>
        t.column !== "Terminé" &&
        t.deadline &&
        t.deadline <= dateIso &&
        (!offset || t.deadline >= addDays(startDate, -offset - 14)),
    ).length;

    return {
      offset,
      label: milestoneLabel(offset),
      dateIso,
      status,
      openTasksDueBy,
    };
  });
}
