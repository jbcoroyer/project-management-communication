"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "../supabaseBrowser";
import type { Priority, Task } from "../types";

export type AutomationTriggerType =
  | "task_created"
  | "moved_to_column"
  | "deadline_overdue"
  | "marked_done";

export type AutomationActionType =
  | "set_priority"
  | "add_assignee"
  | "move_to_column"
  | "notify"
  | "archive";

export type AutomationRule = {
  id: string;
  enabled: boolean;
  name: string;
  triggerType: AutomationTriggerType;
  triggerParams: Record<string, string>;
  actionType: AutomationActionType;
  actionParams: Record<string, string>;
  sortOrder: number;
};

export type AutomationBackend = "supabase" | "local";

const LOCAL_KEY = "v2-automation-rules";
const PROCESSED_SESSION_KEY = "idena-automation-processed";

function loadProcessedAutomationKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(PROCESSED_SESSION_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function saveProcessedAutomationKeys(keys: Set<string>) {
  try {
    window.sessionStorage.setItem(
      PROCESSED_SESSION_KEY,
      JSON.stringify([...keys].slice(-500)),
    );
  } catch {
    /* quota / private mode */
  }
}

export const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  task_created: "Quand une tâche est créée",
  moved_to_column: "Quand une tâche entre dans une colonne",
  deadline_overdue: "Quand une échéance est dépassée",
  marked_done: "Quand une tâche passe en Terminé",
};

export const ACTION_LABELS: Record<AutomationActionType, string> = {
  set_priority: "Définir la priorité",
  add_assignee: "Ajouter un assigné",
  move_to_column: "Déplacer vers une colonne",
  notify: "Envoyer une notification",
  archive: "Archiver la tâche",
};

type RuleRow = {
  id: string;
  enabled: boolean;
  name: string;
  trigger_type: string;
  trigger_params: Record<string, string> | null;
  action_type: string;
  action_params: Record<string, string> | null;
  sort_order: number;
};

function rowToRule(row: RuleRow): AutomationRule {
  return {
    id: row.id,
    enabled: row.enabled,
    name: row.name,
    triggerType: row.trigger_type as AutomationTriggerType,
    triggerParams: row.trigger_params ?? {},
    actionType: row.action_type as AutomationActionType,
    actionParams: row.action_params ?? {},
    sortOrder: row.sort_order ?? 0,
  };
}

function readLocal(): AutomationRule[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AutomationRule[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(rules: AutomationRule[]) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(rules));
  } catch {
    /* quota / private mode : ignoré */
  }
}

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `rule-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function detectBackend(supabase: SupabaseClient): Promise<AutomationBackend> {
  const { error } = await supabase.from("automation_rules").select("id").limit(1);
  return error ? "local" : "supabase";
}

export function useAutomationRules() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [backend, setBackend] = useState<AutomationBackend>("local");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const mode = await detectBackend(supabase);
    setBackend(mode);
    if (mode === "supabase") {
      const { data } = await supabase
        .from("automation_rules")
        .select("*")
        .order("sort_order", { ascending: true });
      setRules(((data ?? []) as RuleRow[]).map(rowToRule));
    } else {
      setRules(readLocal().sort((a, b) => a.sortOrder - b.sortOrder));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createRule = useCallback(
    async (rule: Omit<AutomationRule, "id" | "sortOrder">) => {
      const sortOrder = rules.length;
      if (backend === "supabase") {
        const { data } = await supabase
          .from("automation_rules")
          .insert({
            enabled: rule.enabled,
            name: rule.name,
            trigger_type: rule.triggerType,
            trigger_params: rule.triggerParams,
            action_type: rule.actionType,
            action_params: rule.actionParams,
            sort_order: sortOrder,
          })
          .select()
          .single();
        if (data) setRules((prev) => [...prev, rowToRule(data as RuleRow)]);
        return;
      }
      const created: AutomationRule = { ...rule, id: newId(), sortOrder };
      setRules((prev) => {
        const next = [...prev, created];
        writeLocal(next);
        return next;
      });
    },
    [backend, rules.length, supabase],
  );

  const updateRule = useCallback(
    async (id: string, patch: Partial<AutomationRule>) => {
      setRules((prev) => {
        const next = prev.map((r) => (r.id === id ? { ...r, ...patch } : r));
        if (backend === "local") writeLocal(next);
        return next;
      });
      if (backend === "supabase") {
        const dbPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (patch.enabled !== undefined) dbPatch.enabled = patch.enabled;
        if (patch.name !== undefined) dbPatch.name = patch.name;
        if (patch.triggerType !== undefined) dbPatch.trigger_type = patch.triggerType;
        if (patch.triggerParams !== undefined) dbPatch.trigger_params = patch.triggerParams;
        if (patch.actionType !== undefined) dbPatch.action_type = patch.actionType;
        if (patch.actionParams !== undefined) dbPatch.action_params = patch.actionParams;
        await supabase.from("automation_rules").update(dbPatch).eq("id", id);
      }
    },
    [backend, supabase],
  );

  const deleteRule = useCallback(
    async (id: string) => {
      setRules((prev) => {
        const next = prev.filter((r) => r.id !== id);
        if (backend === "local") writeLocal(next);
        return next;
      });
      if (backend === "supabase") {
        await supabase.from("automation_rules").delete().eq("id", id);
      }
    },
    [backend, supabase],
  );

  return { rules, backend, loading, reload, createRule, updateRule, deleteRule };
}

export function taskMatchesTrigger(rule: AutomationRule, task: Task, now: number): boolean {
  if (task.isArchived || task.parentTaskId) return false;
  switch (rule.triggerType) {
    case "task_created": {
      // Ne se déclenche que sur les tâches réellement récentes (évite d'agir sur
      // tout l'historique au premier chargement).
      if (task.createdAt) {
        const created = new Date(task.createdAt).getTime();
        if (Number.isFinite(created) && now - created > 10 * 60 * 1000) return false;
      }
      const domain = rule.triggerParams.domain;
      return !domain || task.domain === domain;
    }
    case "moved_to_column":
      return task.column === rule.triggerParams.column;
    case "deadline_overdue": {
      if (task.column === "Terminé") return false;
      if (!task.deadline) return false;
      const ts = new Date(task.deadline).getTime();
      return Number.isFinite(ts) && ts < now;
    }
    case "marked_done":
      return task.column === "Terminé";
    default:
      return false;
  }
}

export type AutomationActionRunner = (rule: AutomationRule, task: Task) => void | Promise<void>;

/**
 * Applique les règles activées aux tâches (côté client, V2).
 * Chaque couple (règle, tâche) n'est déclenché qu'une fois par session pour
 * éviter les boucles avec l'écho temps réel.
 */
export function useAutomationRunner(params: {
  rules: AutomationRule[];
  tasks: Task[];
  now: number;
  runAction: AutomationActionRunner;
  enabled?: boolean;
}) {
  const { rules, tasks, now, runAction, enabled = true } = params;
  const processedRef = useRef<Set<string> | null>(null);
  if (processedRef.current === null) {
    processedRef.current = loadProcessedAutomationKeys();
  }
  const runActionRef = useRef(runAction);
  runActionRef.current = runAction;

  useEffect(() => {
    if (!enabled) return;
    const activeRules = rules.filter((r) => r.enabled);
    if (activeRules.length === 0) return;

    const processed = processedRef.current ?? loadProcessedAutomationKeys();
    processedRef.current = processed;

    for (const rule of activeRules) {
      for (const task of tasks) {
        const key = `${rule.id}::${task.id}`;
        if (processed.has(key)) continue;
        if (!taskMatchesTrigger(rule, task, now)) continue;
        processed.add(key);
        saveProcessedAutomationKeys(processed);
        void runActionRef.current(rule, task);
      }
    }
  }, [rules, tasks, now, enabled]);
}
