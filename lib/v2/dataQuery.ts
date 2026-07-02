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

export type ConversationMessage = { role: "user" | "assistant"; text: string };

export type QueryOptions = {
  conversationHistory?: ConversationMessage[];
};

export type QueryAnswer = {
  title: string;
  lines: string[];
  /** Contexte brut pour un enrichissement IA facultatif. */
  bullets: string[];
};

const PERSON_KEYWORDS =
  /(todo|todolist|liste|tâche|tache|tâches|taches|charge|travaille|assigné|assigne|à faire|a faire|faire|résume|résumer|resume|que\s+.+\s+a)/;
const DETAIL_KEYWORDS = /(détail|détails|detail|details|en détail|en detail|liste complète|liste complete|tout voir|montre|montrez|affiche|affichez|énumère|enumere)/;
const TASK_KEYWORDS = /(tâche|tache|tâches|taches|todo|todolist|projet|projets|retard|échéance|echeance|semaine)/;
const STOCK_KEYWORDS = /(stock|article|articles|rupture|réassort|reassort|commander|goodies|print|inventaire)/;

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

function formatDeadline(task: Task): string {
  const ts = deadlineTs(task);
  if (ts === null) return "sans échéance";
  return new Date(ts).toLocaleDateString("fr-FR");
}

function formatTaskLine(task: Task, opts?: { includeAdmin?: boolean }): string {
  const parts = [`${task.projectName}`, `· ${task.column}`];
  if (task.priority && task.priority !== "Moyenne") parts.push(`· ${task.priority}`);
  parts.push(`· ${formatDeadline(task)}`);
  if (opts?.includeAdmin) parts.push(`· ${task.admins[0] ?? "non assigné"}`);
  return parts.join(" ");
}

function matchAdminByToken(token: string, admins: string[]): string | null {
  const t = token.toLowerCase().trim();
  if (t.length < 2) return null;
  for (const name of admins) {
    const lower = name.toLowerCase();
    if (lower === t || lower.startsWith(t)) return name;
    const parts = lower.split(/[\s-]+/).filter(Boolean);
    if (parts.some((p) => p === t || p.startsWith(t))) return name;
    const initials = parts.map((p) => p[0] ?? "").join("");
    if (initials === t || (initials.startsWith(t) && t.length >= 2)) return name;
  }
  return null;
}

/** Trouve un collaborateur mentionné dans la question (nom complet, prénom ou initiales). */
function findPersonInQuery(q: string, tasks: Task[]): string | null {
  const admins = collectAdmins(tasks);

  const possessive =
    q.match(/(?:la\s+)?(?:todo|todolist|liste|tâches?|taches?)\s+d['']\s*([a-zàâäéèêëïîôùûüç-]+)/i) ??
    q.match(/(?:la\s+)?(?:todo|todolist|liste|tâches?|taches?)\s+de\s+([a-zàâäéèêëïîôùûüç-]+)/i) ??
    q.match(/\b(?:de|d[''])\s*([a-zàâäéèêëïîôùûüç-]{3,})/i);
  if (possessive?.[1]) {
    const hit = matchAdminByToken(possessive[1], admins);
    if (hit) return hit;
  }

  for (const name of admins) {
    if (q.includes(name.toLowerCase())) return name;
  }

  for (const name of admins) {
    const parts = name.toLowerCase().split(/[\s-]+/).filter(Boolean);
    const initials = parts.map((p) => p[0] ?? "").join("");
    if (initials.length >= 2 && q.includes(initials)) return name;
    const tokens = q.split(/[\s,?'".]+/).filter((t) => t.length >= 2);
    for (const token of tokens) {
      if (token === initials) return name;
      if (initials.startsWith(token) && token.length >= 2) return name;
      if (parts.some((p) => p === token || (p.startsWith(token) && token.length >= 3))) return name;
    }
  }
  return null;
}

function tasksForPerson(active: Task[], person: string): Task[] {
  const key = person.toLowerCase();
  return active.filter((t) => t.admins.some((a) => a.trim().toLowerCase() === key));
}

function sortTasksByUrgency(tasks: Task[]): Task[] {
  const now = Date.now();
  return [...tasks].sort((a, b) => {
    const aTs = deadlineTs(a);
    const bTs = deadlineTs(b);
    const aOverdue = aTs !== null && aTs < now;
    const bOverdue = bTs !== null && bTs < now;
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
    if (aTs === null && bTs === null) return a.projectName.localeCompare(b.projectName, "fr");
    if (aTs === null) return 1;
    if (bTs === null) return -1;
    return aTs - bTs;
  });
}

function personWorkloadAnswer(person: string, theirs: Task[]): QueryAnswer {
  const sorted = sortTasksByUrgency(theirs);
  const lines = sorted.map((t) => formatTaskLine(t));
  const hours = theirs.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
  const title = `${person} — ${theirs.length} tâche(s) active(s)${hours > 0 ? `, ~${Math.round(hours)} h estimées` : ""}`;
  return {
    title,
    lines: lines.length > 0 ? lines : ["Aucune tâche active pour cette personne."],
    bullets: lines,
  };
}

function detailedTasksAnswer(active: Task[], title: string, limit = 25): QueryAnswer {
  const sorted = sortTasksByUrgency(active);
  const lines = sorted.slice(0, limit).map((t) => formatTaskLine(t, { includeAdmin: true }));
  if (sorted.length > limit) {
    lines.push(`… et ${sorted.length - limit} autre(s) tâche(s).`);
  }
  return {
    title: `${title} (${sorted.length})`,
    lines: lines.length > 0 ? lines : ["Aucune tâche active."],
    bullets: lines,
  };
}

function detailedStockAnswer(inventory: InventoryItem[]): QueryAnswer {
  const low = inventory.filter(isLowStock);
  if (low.length === 0) {
    return { title: "Stock", lines: ["Aucun article sous le seuil d'alerte."], bullets: [] };
  }
  const lines = low.map(
    (i) => `${i.name} (${i.category}) — ${i.quantity} restant(s), seuil ${i.alertThreshold}`,
  );
  return { title: `${low.length} article(s) à réapprovisionner`, lines, bullets: lines };
}

function combinedTasksAndStockAnswer(ctx: QueryContext, active: Task[]): QueryAnswer {
  const taskLines = sortTasksByUrgency(active)
    .slice(0, 15)
    .map((t) => formatTaskLine(t, { includeAdmin: true }));
  const low = ctx.inventory.filter(isLowStock);
  const stockLines = low.map(
    (i) => `${i.name} (${i.category}) — ${i.quantity} restant(s), seuil ${i.alertThreshold}`,
  );

  const lines: string[] = [];
  if (taskLines.length > 0) {
    lines.push("— Tâches actives —");
    lines.push(...taskLines);
    if (active.length > 15) lines.push(`… et ${active.length - 15} autre(s) tâche(s).`);
  } else {
    lines.push("Aucune tâche active.");
  }
  lines.push("");
  if (stockLines.length > 0) {
    lines.push("— Articles à réapprovisionner —");
    lines.push(...stockLines);
  } else {
    lines.push("Aucun article sous le seuil d'alerte.");
  }

  return {
    title: `Détail · ${active.length} tâche(s) · ${low.length} article(s) stock bas`,
    lines,
    bullets: lines.filter((l) => l && !l.startsWith("—")),
  };
}

function defaultDetailedAnswer(ctx: QueryContext, active: Task[]): QueryAnswer {
  const now = Date.now();
  const overdue = active.filter((t) => {
    const ts = deadlineTs(t);
    return ts !== null && ts < now;
  });
  const low = ctx.inventory.filter(isLowStock);
  const upcomingEvents = ctx.events.filter((e) => new Date(e.endDate).getTime() >= now);

  const lines: string[] = [
    `${active.length} tâche(s) active(s), dont ${overdue.length} en retard.`,
    `${upcomingEvents.length} événement(s) à venir.`,
    `${low.length} article(s) à réapprovisionner.`,
    "",
  ];

  if (overdue.length > 0) {
    lines.push("— Tâches en retard —");
    lines.push(...overdue.slice(0, 8).map((t) => formatTaskLine(t, { includeAdmin: true })));
    if (overdue.length > 8) lines.push(`… et ${overdue.length - 8} autre(s).`);
    lines.push("");
  }

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const week = active.filter((t) => {
    const ts = deadlineTs(t);
    return ts !== null && isWithinInterval(new Date(ts), { start: weekStart, end: weekEnd });
  });
  if (week.length > 0) {
    lines.push("— Échéances cette semaine —");
    lines.push(...week.slice(0, 8).map((t) => formatTaskLine(t, { includeAdmin: true })));
    if (week.length > 8) lines.push(`… et ${week.length - 8} autre(s).`);
    lines.push("");
  }

  if (low.length > 0) {
    lines.push("— Stock bas —");
    lines.push(
      ...low.slice(0, 6).map((i) => `${i.name} — ${i.quantity} restant(s), seuil ${i.alertThreshold}`),
    );
    if (low.length > 6) lines.push(`… et ${low.length - 6} autre(s) article(s).`);
  }

  return {
    title: "Vue d'ensemble détaillée",
    lines,
    bullets: lines.filter((l) => l && !l.startsWith("—")),
  };
}

function lastUserQuestion(history: ConversationMessage[]): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]?.role === "user") {
      const text = history[i].text.trim();
      if (text.length > 0) return text;
    }
  }
  return null;
}

function expandQuestion(question: string, history?: ConversationMessage[]): string {
  const q = question.toLowerCase().trim();
  if (!DETAIL_KEYWORDS.test(q) && !/^(et|aussi|également|egalement)\b/.test(q)) {
    return question;
  }
  const prev = history ? lastUserQuestion(history.slice(0, -1)) : null;
  if (!prev) return question;
  return `${prev} — ${question}`;
}

function wantsTasks(q: string): boolean {
  return TASK_KEYWORDS.test(q);
}

function wantsStock(q: string): boolean {
  return STOCK_KEYWORDS.test(q);
}

function wantsPersonQuery(q: string): boolean {
  return PERSON_KEYWORDS.test(q) || /(?:de|d[''])\s*[a-zàâäéèêëïîôùûüç-]{3,}/i.test(q);
}

/**
 * Répond à une question en langage naturel à partir des données réelles.
 * Analyse heuristique (mots-clés) — pas de dépendance réseau.
 */
export function answerQuestion(
  question: string,
  ctx: QueryContext,
  options?: QueryOptions,
): QueryAnswer {
  const expanded = expandQuestion(question, options?.conversationHistory);
  const q = expanded.toLowerCase();
  const now = Date.now();
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const active = activeTasks(ctx.tasks);
  const person = findPersonInQuery(q, ctx.tasks);
  const asksDetail = DETAIL_KEYWORDS.test(q);
  const asksTasks = wantsTasks(q);
  const asksStock = wantsStock(q);

  // Requête combinée tâches + articles.
  if (asksTasks && asksStock) {
    return combinedTasksAndStockAnswer(ctx, active);
  }

  // Follow-up « détail » sans autre précision → vue détaillée ou sujet précédent.
  if (asksDetail && !asksTasks && !asksStock && !person) {
    if (/(retard|overdue)/.test(q)) {
      const overdue = active.filter((t) => {
        const ts = deadlineTs(t);
        return ts !== null && ts < now;
      });
      return detailedTasksAnswer(overdue, "Tâches en retard");
    }
    if (/(semaine|échéance|echeance)/.test(q)) {
      const week = active.filter((t) => {
        const ts = deadlineTs(t);
        return ts !== null && isWithinInterval(new Date(ts), { start: weekStart, end: weekEnd });
      });
      return detailedTasksAnswer(week, "Échéances cette semaine");
    }
    return defaultDetailedAnswer(ctx, active);
  }

  // Personne détectée → todo détaillée (todo, liste, ou simple mention).
  if (person && (wantsPersonQuery(q) || asksDetail || /todo|todolist|liste/.test(q))) {
    return personWorkloadAnswer(person, tasksForPerson(active, person));
  }

  // Personne mentionnée sans autre mot-clé → todo par défaut.
  if (person) {
    return personWorkloadAnswer(person, tasksForPerson(active, person));
  }

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
  if (asksStock) {
    return detailedStockAnswer(ctx.inventory);
  }

  // Retards.
  if (/(retard|overdue|dépassé|depasse|en retard)/.test(q)) {
    const overdue = active.filter((t) => {
      const ts = deadlineTs(t);
      return ts !== null && ts < now;
    });
    const lines = overdue.map((t) => formatTaskLine(t, { includeAdmin: true }));
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
    const lines = week.map((t) => formatTaskLine(t, { includeAdmin: true }));
    return {
      title: `${week.length} échéance(s) cette semaine`,
      lines: lines.length > 0 ? lines : ["Aucune échéance cette semaine."],
      bullets: lines,
    };
  }

  // Liste / détail des tâches seules.
  if (asksTasks || asksDetail) {
    return detailedTasksAnswer(active, "Tâches actives");
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

  // Repli : vue détaillée utile (plus de message « reformulez »).
  return defaultDetailedAnswer(ctx, active);
}
