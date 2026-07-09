import type { Task } from "../types";
import type { IntakeRequest } from "./intake";

const STOP_WORDS = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "pour", "avec", "sur", "et",
  "ou", "à", "au", "aux", "en", "dans", "par", "ce", "cette", "nos", "notre", "vos",
  "the", "a", "of", "for", "and", "to", "in",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  return inter / (a.size + b.size - inter);
}

export type DuplicateHit = { task: Task; score: number };

/** Détecte les tâches existantes proches d'une demande (déduplication du triage). */
export function findDuplicateTasks(request: IntakeRequest, tasks: Task[], threshold = 0.3): DuplicateHit[] {
  const reqTokens = tokenize(
    `${request.title} ${request.concern} ${request.supportFormat} ${request.description}`,
  );
  return tasks
    .filter((t) => !t.isArchived && !t.parentTaskId)
    .map((task) => ({ task, score: jaccard(reqTokens, tokenize(`${task.projectName} ${task.description}`)) }))
    .filter((hit) => hit.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

/**
 * Suggère un assigné : la personne qui traite le plus le domaine suggéré,
 * pondérée par une charge active faible (répartition équitable).
 */
export function suggestAssignee(
  request: IntakeRequest,
  tasks: Task[],
  admins: string[],
): string | null {
  const domain = request.suggestedDomain;
  const domainCount = new Map<string, number>();
  const activeCount = new Map<string, number>();
  for (const admin of admins) {
    domainCount.set(admin, 0);
    activeCount.set(admin, 0);
  }

  for (const task of tasks) {
    if (task.isArchived || task.parentTaskId) continue;
    for (const admin of task.admins) {
      if (!admins.includes(admin)) continue;
      activeCount.set(admin, (activeCount.get(admin) ?? 0) + 1);
      if (domain && task.domain === domain) {
        domainCount.set(admin, (domainCount.get(admin) ?? 0) + 1);
      }
    }
  }

  let best: string | null = null;
  let bestScore = -Infinity;
  for (const admin of admins) {
    const affinity = domainCount.get(admin) ?? 0;
    const load = activeCount.get(admin) ?? 0;
    const score = affinity * 2 - load * 0.1;
    if (score > bestScore) {
      bestScore = score;
      best = admin;
    }
  }
  return best;
}
