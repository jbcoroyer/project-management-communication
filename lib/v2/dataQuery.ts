import { endOfWeek, isWithinInterval, startOfWeek } from "date-fns";
import type { Task } from "../types";
import type { EventRow } from "../eventTypes";
import type { InventoryItem } from "../inventoryTypes";
import { isLowStock } from "../inventoryTypes";
import { DONE_COLUMN_NAME } from "../workflowConstants";

export type QueryContext = {
  tasks: Task[];
  events: EventRow[];
  inventory: InventoryItem[];
};

export type QueryAnswer = {
  title: string;
  lines: string[];
  /** Contexte brut pour un enrichissement IA facultatif. */
  bullets: string[];
};

function activeTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => !t.isArchived && !t.parentTaskId && t.column !== DONE_COLUMN_NAME);
}

function deadlineTs(task: Task): number | null {
  if (!task.deadline) return null;
  const ts = new Date(task.deadline).getTime();
  return Number.isFinite(ts) ? ts : null;
}

function collectAdmins(tasks: Task[]): string[] {
  const seen = new Set<string>();
  const list: string[] = [];
  for (const t of tasks) {
    for (const a of t.admins) {
      const n = a?.trim();
      if (n && !seen.has(n.toLowerCase())) {
        seen.add(n.toLowerCase());
        list.push(n);
      }
    }
  }
  return list.sort((a, b) => b.length - a.length);
}

function eur(n: number): string {
  return `${Math.round(n).toLocaleString("fr-FR")} €`;
}

/** Trouve un collaborateur mentionné dans la question (nom complet, prénom ou initiales). */
function findPersonInQuery(q: string, tasks: Task[]): string | null {
  for (const name of collectAdmins(tasks)) {
    if (q.includes(name.toLowerCase())) return name;
  }
  for (const name of collectAdmins(tasks)) {
    const parts = name.toLowerCase().split(/[\s-]+/).filter(Boolean);
    const initials = parts.map((p) => p[0] ?? "").join("");
    if (initials.length >= 2 && q.includes(initials)) return name;
    const tokens = q.split(/[\s,?'".]+/).filter((t) => t.length >= 2);
    for (const token of tokens) {
      if (token === initials) return name;
      if (initials.startsWith(token) && token.length >= 2) return name;
      if (parts.some((p) => p === token)) return name;
    }
  }
  return null;
}

function tasksForPerson(active: Task[], person: string): Task[] {
  const key = person.toLowerCase();
  return active.filter((t) => t.admins.some((a) => a.trim().toLowerCase() === key));
}

function personWorkloadAnswer(person: string, theirs: Task[]): QueryAnswer {
  const byColumn = new Map<string, Task[]>();
  for (const t of theirs) {
    const arr = byColumn.get(t.column) ?? [];
    arr.push(t);
    byColumn.set(t.column, arr);
  }
  const lines: string[] = [];
  for (const [col, list] of byColumn) {
    const names = list.map((t) => t.projectName).join(", ");
    lines.push(`${col} (${list.length}) : ${names || "—"}`);
  }
  const hours = theirs.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
  const title = `${person} — ${theirs.length} tâche(s) active(s)${hours > 0 ? `, ~${Math.round(hours)} h estimées` : ""}`;
  return {
    title,
    lines: lines.length > 0 ? lines : ["Aucune tâche active pour cette personne."],
    bullets: lines,
  };
}

/**
 * Répond à une question en langage naturel à partir des données réelles.
 * Analyse heuristique (mots-clés) — pas de dépendance réseau.
 */
export function answerQuestion(question: string, ctx: QueryContext): QueryAnswer {
  const q = question.toLowerCase();
  const now = Date.now();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const active = activeTasks(ctx.tasks);

  // Résumé du jour / standup.
  if (/(résumé du jour|resume du jour|synthèse du jour|synthese du jour|aujourd'hui|aujourdhui|priorités du jour|priorites du jour)/.test(q)) {
    const overdue = active.filter((t) => {
      const ts = deadlineTs(t);
      return ts !== null && ts < now;
    });
    const week = active.filter((t) => {
      const ts = deadlineTs(t);
      return ts !== null && isWithinInterval(new Date(ts), { start: weekStart, end: weekEnd });
    });
    const inProgress = active.filter((t) => t.column === "En cours");
    const lines = [
      `${inProgress.length} tâche(s) en cours : ${inProgress.slice(0, 6).map((t) => t.projectName).join(", ") || "—"}`,
      `${week.length} échéance(s) cette semaine`,
      `${overdue.length} tâche(s) en retard`,
      `${ctx.inventory.filter(isLowStock).length} article(s) stock bas`,
    ];
    return { title: "Synthèse du jour", lines, bullets: lines };
  }

  // Tâches / charge d'une personne (nom, prénom ou initiales).
  const person = findPersonInQuery(q, ctx.tasks);
  if (
    person &&
    /(résume|résumer|resume|faire|tâche|tache|charge|travaille|assigné|assigne|à faire|a faire|que\s+.+\s+a)/.test(q)
  ) {
    return personWorkloadAnswer(person, tasksForPerson(active, person));
  }
  if (/(budget|coût|cout|dépense|depense|engagé|engage)/.test(q) && /(salon|événement|evenement|event)/.test(q)) {
    const match = ctx.events.find((e) => e.name && q.includes(e.name.toLowerCase()));
    const target = match ?? ctx.events.find((e) => new Date(e.endDate).getTime() >= now) ?? ctx.events[0];
    if (!target) {
      return { title: "Budget événement", lines: ["Aucun événement trouvé."], bullets: [] };
    }
    const consumed = target.closureRecap?.consumedTotal ?? 0;
    const lines = [
      `${target.name} — budget alloué : ${eur(target.allocatedBudget)}`,
      consumed > 0 ? `Consommé : ${eur(consumed)} (écart ${eur(consumed - target.allocatedBudget)})` : "Consommé : pas encore de clôture chiffrée.",
    ];
    return { title: `Budget · ${target.name}`, lines, bullets: lines };
  }

  // Stock bas / à commander.
  if (/(stock|rupture|réassort|reassort|commander|goodies|print)/.test(q)) {
    const low = ctx.inventory.filter(isLowStock);
    if (low.length === 0) {
      return { title: "Stock", lines: ["Aucun article sous le seuil d'alerte."], bullets: [] };
    }
    const lines = low.slice(0, 12).map((i) => `${i.name} (${i.category}) : ${i.quantity} restant(s), seuil ${i.alertThreshold}`);
    return { title: `${low.length} article(s) à réapprovisionner`, lines, bullets: lines };
  }

  // Retards.
  if (/(retard|overdue|dépassé|depasse|en retard)/.test(q)) {
    const overdue = active.filter((t) => {
      const ts = deadlineTs(t);
      return ts !== null && ts < now;
    });
    const lines = overdue
      .slice(0, 15)
      .map((t) => `${t.projectName} — ${t.admins[0] ?? "non assigné"} · échéance ${new Date(t.deadline).toLocaleDateString("fr-FR")}`);
    return {
      title: `${overdue.length} tâche(s) en retard`,
      lines: lines.length > 0 ? lines : ["Aucune tâche en retard 🎉"],
      bullets: lines,
    };
  }

  // Cette semaine.
  if (/(cette semaine|semaine|à venir|a venir|échéance|echeance)/.test(q)) {
    const week = active.filter((t) => {
      const ts = deadlineTs(t);
      return ts !== null && isWithinInterval(new Date(ts), { start: weekStart, end: weekEnd });
    });
    const lines = week
      .slice(0, 15)
      .map((t) => `${t.projectName} — ${t.admins[0] ?? "non assigné"} · ${new Date(t.deadline).toLocaleDateString("fr-FR")}`);
    return {
      title: `${week.length} échéance(s) cette semaine`,
      lines: lines.length > 0 ? lines : ["Aucune échéance cette semaine."],
      bullets: lines,
    };
  }

  // Charge / tâches d'une personne (nom explicite dans une tâche).
  if (person && /(charge|tâche|tache|fait|faire|travaille|assigné|assigne)/.test(q)) {
    return personWorkloadAnswer(person, tasksForPerson(active, person));
  }

  // Comptage générique.
  if (/(combien|nombre|count)/.test(q)) {
    return {
      title: "Vue d'ensemble",
      lines: [
        `${active.length} tâche(s) active(s)`,
        `${ctx.events.filter((e) => new Date(e.endDate).getTime() >= now).length} événement(s) à venir`,
        `${ctx.inventory.filter(isLowStock).length} article(s) en stock bas`,
      ],
      bullets: [],
    };
  }

  // Repli : synthèse générale.
  const overdue = active.filter((t) => {
    const ts = deadlineTs(t);
    return ts !== null && ts < now;
  });
  return {
    title: "Synthèse",
    lines: [
      `${active.length} tâches actives, dont ${overdue.length} en retard.`,
      `${ctx.events.filter((e) => new Date(e.endDate).getTime() >= now).length} événements à venir.`,
      `${ctx.inventory.filter(isLowStock).length} articles à réapprovisionner.`,
      "Reformulez pour cibler : retards, cette semaine, budget d'un salon, stock, ou une personne.",
    ],
    bullets: [],
  };
}
