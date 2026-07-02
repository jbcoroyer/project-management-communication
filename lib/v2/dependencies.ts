"use client";

import { useCallback, useEffect, useState } from "react";
import type { Task } from "../types";

/** Une dépendance : `blockerId` doit être fait avant `blockedId`. */
export type Dependency = { id: string; blockerId: string; blockedId: string };

const LOCAL_KEY = "v2-task-dependencies";

function read(): Dependency[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Dependency[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list: Dependency[]) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    /* ignoré */
  }
}

/** Détecte si ajouter blocker→blocked créerait un cycle. */
function wouldCycle(deps: Dependency[], blockerId: string, blockedId: string): boolean {
  if (blockerId === blockedId) return true;
  const adj = new Map<string, string[]>();
  for (const d of deps) {
    const arr = adj.get(d.blockerId) ?? [];
    arr.push(d.blockedId);
    adj.set(d.blockerId, arr);
  }
  // Cherche un chemin existant blocked -> blocker (qui, avec la nouvelle arête, boucle).
  const stack = [blockedId];
  const seen = new Set<string>();
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === blockerId) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const next of adj.get(cur) ?? []) stack.push(next);
  }
  return false;
}

export function useDependencies() {
  const [deps, setDeps] = useState<Dependency[]>([]);

  useEffect(() => {
    setDeps(read());
  }, []);

  const add = useCallback((blockerId: string, blockedId: string): { ok: boolean; reason?: string } => {
    let result: { ok: boolean; reason?: string } = { ok: true };
    setDeps((prev) => {
      if (prev.some((d) => d.blockerId === blockerId && d.blockedId === blockedId)) {
        result = { ok: false, reason: "Dépendance déjà existante." };
        return prev;
      }
      if (wouldCycle(prev, blockerId, blockedId)) {
        result = { ok: false, reason: "Cette dépendance créerait un cycle." };
        return prev;
      }
      const next = [...prev, { id: globalThis.crypto?.randomUUID?.() ?? `dep-${Date.now()}`, blockerId, blockedId }];
      write(next);
      return next;
    });
    return result;
  }, []);

  const remove = useCallback((id: string) => {
    setDeps((prev) => {
      const next = prev.filter((d) => d.id !== id);
      write(next);
      return next;
    });
  }, []);

  return { deps, add, remove };
}

function taskWeight(task: Task): number {
  if (task.estimatedHours > 0) return task.estimatedHours;
  if (task.estimatedDays > 0) return task.estimatedDays * 7;
  return 1;
}

export type CriticalPathResult = {
  path: string[]; // ids ordonnés
  totalHours: number;
};

/** Calcule le chemin critique (plus longue chaîne pondérée par la charge estimée). */
export function computeCriticalPath(tasks: Task[], deps: Dependency[]): CriticalPathResult {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const successors = new Map<string, string[]>();
  const indegree = new Map<string, number>();
  for (const t of tasks) indegree.set(t.id, 0);
  for (const d of deps) {
    if (!byId.has(d.blockerId) || !byId.has(d.blockedId)) continue;
    const arr = successors.get(d.blockerId) ?? [];
    arr.push(d.blockedId);
    successors.set(d.blockerId, arr);
    indegree.set(d.blockedId, (indegree.get(d.blockedId) ?? 0) + 1);
  }

  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const queue: string[] = [];
  for (const t of tasks) {
    if ((indegree.get(t.id) ?? 0) === 0) {
      queue.push(t.id);
      dist.set(t.id, taskWeight(t));
      prev.set(t.id, null);
    }
  }

  const localIndeg = new Map(indegree);
  while (queue.length) {
    const cur = queue.shift()!;
    const curDist = dist.get(cur) ?? 0;
    for (const nxt of successors.get(cur) ?? []) {
      const w = taskWeight(byId.get(nxt)!);
      const cand = curDist + w;
      if (cand > (dist.get(nxt) ?? -Infinity)) {
        dist.set(nxt, cand);
        prev.set(nxt, cur);
      }
      localIndeg.set(nxt, (localIndeg.get(nxt) ?? 0) - 1);
      if ((localIndeg.get(nxt) ?? 0) === 0) queue.push(nxt);
    }
  }

  let endId: string | null = null;
  let best = -Infinity;
  for (const [id, d] of dist.entries()) {
    if (d > best) {
      best = d;
      endId = id;
    }
  }

  const path: string[] = [];
  let cur = endId;
  while (cur) {
    path.unshift(cur);
    cur = prev.get(cur) ?? null;
  }
  return { path, totalHours: best === -Infinity ? 0 : best };
}
