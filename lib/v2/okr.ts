"use client";

import { useCallback, useEffect, useState } from "react";
import type { Task } from "../types";
import { DONE_COLUMN_NAME } from "../workflowConstants";

export type KeyResult = {
  id: string;
  label: string;
  /** Domaine lié pour la progression auto (null = manuel). */
  linkedDomain: string | null;
  target: number;
  current: number;
};

export type Objective = {
  id: string;
  title: string;
  company: string | null;
  period: string;
  keyResults: KeyResult[];
};

const LOCAL_KEY = "v2-okr-objectives";

function read(): Objective[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? (JSON.parse(raw) as Objective[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list: Objective[]) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    /* ignoré */
  }
}

function newId(prefix: string): string {
  return globalThis.crypto?.randomUUID?.() ?? `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useObjectives() {
  const [objectives, setObjectives] = useState<Objective[]>([]);

  useEffect(() => {
    setObjectives(read());
  }, []);

  const addObjective = useCallback((title: string, company: string | null, period: string) => {
    setObjectives((prev) => {
      const next = [...prev, { id: newId("obj"), title, company, period, keyResults: [] }];
      write(next);
      return next;
    });
  }, []);

  const removeObjective = useCallback((id: string) => {
    setObjectives((prev) => {
      const next = prev.filter((o) => o.id !== id);
      write(next);
      return next;
    });
  }, []);

  const addKeyResult = useCallback((objectiveId: string, kr: Omit<KeyResult, "id">) => {
    setObjectives((prev) => {
      const next = prev.map((o) =>
        o.id === objectiveId ? { ...o, keyResults: [...o.keyResults, { ...kr, id: newId("kr") }] } : o,
      );
      write(next);
      return next;
    });
  }, []);

  const updateKeyResult = useCallback((objectiveId: string, krId: string, patch: Partial<KeyResult>) => {
    setObjectives((prev) => {
      const next = prev.map((o) =>
        o.id === objectiveId
          ? { ...o, keyResults: o.keyResults.map((kr) => (kr.id === krId ? { ...kr, ...patch } : kr)) }
          : o,
      );
      write(next);
      return next;
    });
  }, []);

  const removeKeyResult = useCallback((objectiveId: string, krId: string) => {
    setObjectives((prev) => {
      const next = prev.map((o) =>
        o.id === objectiveId ? { ...o, keyResults: o.keyResults.filter((kr) => kr.id !== krId) } : o,
      );
      write(next);
      return next;
    });
  }, []);

  return { objectives, addObjective, removeObjective, addKeyResult, updateKeyResult, removeKeyResult };
}

/** Progression effective d'un KR : auto depuis les tâches si un domaine est lié, sinon current/target. */
export function keyResultProgress(kr: KeyResult, tasks: Task[]): { value: number; ratio: number; auto: boolean } {
  if (kr.linkedDomain) {
    const scope = tasks.filter((t) => !t.isArchived && !t.parentTaskId && t.domain === kr.linkedDomain);
    const done = scope.filter((t) => t.column === DONE_COLUMN_NAME).length;
    const target = kr.target > 0 ? kr.target : scope.length || 1;
    return { value: done, ratio: Math.min(1, done / target), auto: true };
  }
  const target = kr.target > 0 ? kr.target : 1;
  return { value: kr.current, ratio: Math.min(1, kr.current / target), auto: false };
}

export function objectiveProgress(obj: Objective, tasks: Task[]): number {
  if (obj.keyResults.length === 0) return 0;
  const total = obj.keyResults.reduce((acc, kr) => acc + keyResultProgress(kr, tasks).ratio, 0);
  return total / obj.keyResults.length;
}
