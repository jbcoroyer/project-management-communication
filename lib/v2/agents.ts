import type { Task } from "../types";
import { DONE_COLUMN_NAME } from "../workflowConstants";

export type AgentTaskRef = { id: string; label: string; meta: string };

export type AgentResult = {
  title: string;
  /** Lignes de synthèse lisibles. */
  lines: string[];
  /** Contexte pour enrichissement IA. */
  bullets: string[];
  /** Tâches sur lesquelles agir (relances, statuts). */
  actionableTasks: AgentTaskRef[];
};

function active(tasks: Task[]): Task[] {
  return tasks.filter((t) => !t.isArchived && !t.parentTaskId && t.column !== DONE_COLUMN_NAME);
}

function forPerson(tasks: Task[], person: string | null | undefined): Task[] {
  const me = person?.trim().toLowerCase();
  if (!me) return tasks;
  return tasks.filter((t) => t.admins.some((a) => a.trim().toLowerCase() === me));
}

/** Agent « Résumé de la semaine » : avancement par colonne et domaine. */
export function weeklySummaryAgent(tasks: Task[]): AgentResult {
  const act = active(tasks);
  const byColumn = new Map<string, number>();
  const byDomain = new Map<string, number>();
  for (const t of act) {
    byColumn.set(t.column, (byColumn.get(t.column) ?? 0) + 1);
    byDomain.set(t.domain, (byDomain.get(t.domain) ?? 0) + 1);
  }
  const done = tasks.filter((t) => t.column === DONE_COLUMN_NAME && !t.isArchived).length;
  const bullets = [
    `${act.length} tâches actives, ${done} terminées récemment`,
    ...Array.from(byColumn.entries()).map(([col, n]) => `${col} : ${n}`),
    ...Array.from(byDomain.entries()).map(([dom, n]) => `Domaine ${dom} : ${n}`),
  ];
  return {
    title: "Résumé de la semaine",
    lines: bullets,
    bullets,
    actionableTasks: [],
  };
}

/** Agent « Relances retards » : tâches en retard à relancer. */
export function overdueAgent(tasks: Task[]): AgentResult {
  const now = Date.now();
  const overdue = active(tasks).filter((t) => {
    if (!t.deadline) return false;
    const ts = new Date(t.deadline).getTime();
    return Number.isFinite(ts) && ts < now;
  });
  const actionableTasks = overdue.map((t) => ({
    id: t.id,
    label: t.projectName || "Sans titre",
    meta: `${t.admins[0] ?? "non assigné"} · échéance ${new Date(t.deadline).toLocaleDateString("fr-FR")}`,
  }));
  return {
    title: `${overdue.length} tâche(s) en retard`,
    lines: actionableTasks.map((a) => `${a.label} — ${a.meta}`),
    bullets: actionableTasks.map((a) => `${a.label} — ${a.meta}`),
    actionableTasks,
  };
}

/** Agent « Standup asynchrone » pour une personne : en cours / à faire / en validation. */
export function standupAgent(tasks: Task[], person: string | null | undefined): AgentResult {
  const mine = active(forPerson(tasks, person));
  const inProgress = mine.filter((t) => t.column === "En cours");
  const todo = mine.filter((t) => t.column === "À faire");
  const review = mine.filter((t) => t.column === "En validation");
  const lines = [
    `🔵 En cours (${inProgress.length}) : ${inProgress.map((t) => t.projectName).join(", ") || "—"}`,
    `⚪ À faire (${todo.length}) : ${todo.map((t) => t.projectName).join(", ") || "—"}`,
    `🟣 En validation (${review.length}) : ${review.map((t) => t.projectName).join(", ") || "—"}`,
  ];
  return {
    title: `Standup ${person ? `— ${person}` : ""}`.trim(),
    lines,
    bullets: lines,
    actionableTasks: [],
  };
}

/** Agent « Sans échéance » : tâches actives sans deadline (à cadrer). */
export function noDeadlineAgent(tasks: Task[]): AgentResult {
  const items = active(tasks).filter((t) => !t.deadline);
  const actionableTasks = items.map((t) => ({
    id: t.id,
    label: t.projectName || "Sans titre",
    meta: `${t.admins[0] ?? "non assigné"} · ${t.column}`,
  }));
  return {
    title: `${items.length} tâche(s) sans échéance`,
    lines: actionableTasks.map((a) => `${a.label} — ${a.meta}`),
    bullets: actionableTasks.map((a) => `${a.label} — ${a.meta}`),
    actionableTasks,
  };
}
