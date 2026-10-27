import type { SupabaseClient } from "@supabase/supabase-js";
import { taskMatchesTrigger, type AutomationRule } from "../v2/automations";
import { mapTaskRow } from "../taskMappers";
import { TASK_SELECT_WITH_EVENT } from "../taskQueries";
import type { Priority, Task } from "../types";

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

type PatchBucket = {
  patch: Record<string, unknown>;
  ids: string[];
};

function rowToRule(row: RuleRow): AutomationRule {
  return {
    id: row.id,
    enabled: row.enabled,
    name: row.name,
    triggerType: row.trigger_type as AutomationRule["triggerType"],
    triggerParams: row.trigger_params ?? {},
    actionType: row.action_type as AutomationRule["actionType"],
    actionParams: row.action_params ?? {},
    sortOrder: row.sort_order ?? 0,
  };
}

function patchKey(patch: Record<string, unknown>): string {
  return JSON.stringify(patch);
}

/**
 * Exécute les automatisations côté serveur (service role).
 * Les updates sont regroupés par patch identique (`.in("id", ids)`).
 */
export async function runAutomationsServer(
  admin: SupabaseClient,
): Promise<{ applied: number; skipped: number; errors: string[] }> {
  const errors: string[] = [];
  let applied = 0;
  let skipped = 0;

  const { data: ruleRows, error: rulesErr } = await admin
    .from("automation_rules")
    .select(
      "id, enabled, name, trigger_type, trigger_params, action_type, action_params, sort_order",
    )
    .eq("enabled", true)
    .order("sort_order", { ascending: true });

  if (rulesErr) {
    return { applied: 0, skipped: 0, errors: [rulesErr.message] };
  }

  const rules = ((ruleRows ?? []) as RuleRow[]).map(rowToRule);
  if (rules.length === 0) return { applied: 0, skipped: 0, errors: [] };

  const { data: taskRows, error: tasksErr } = await admin
    .from("tasks")
    .select(TASK_SELECT_WITH_EVENT)
    .eq("is_archived", false)
    .limit(2000);

  if (tasksErr) {
    return { applied: 0, skipped: 0, errors: [tasksErr.message] };
  }

  const tasks = (taskRows ?? []).map((row) => mapTaskRow(row));
  const now = Date.now();
  const buckets = new Map<string, PatchBucket>();

  for (const rule of rules) {
    for (const task of tasks) {
      if (!taskMatchesTrigger(rule, task, now)) {
        skipped += 1;
        continue;
      }
      const patch = buildServerPatch(rule, task);
      if (!patch) {
        skipped += 1;
        continue;
      }
      const key = patchKey(patch);
      const bucket = buckets.get(key);
      if (bucket) {
        if (!bucket.ids.includes(task.id)) bucket.ids.push(task.id);
      } else {
        buckets.set(key, { patch, ids: [task.id] });
      }
    }
  }

  for (const bucket of buckets.values()) {
    // Chunk pour rester sous les limites PostgREST.
    const chunkSize = 100;
    for (let i = 0; i < bucket.ids.length; i += chunkSize) {
      const chunk = bucket.ids.slice(i, i + chunkSize);
      const { error } = await admin.from("tasks").update(bucket.patch).in("id", chunk);
      if (error) {
        errors.push(`${JSON.stringify(bucket.patch)}: ${error.message}`);
      } else {
        applied += chunk.length;
      }
    }
  }

  return { applied, skipped, errors };
}

function buildServerPatch(
  rule: AutomationRule,
  task: Task,
): Record<string, unknown> | null {
  switch (rule.actionType) {
    case "set_priority": {
      const p = rule.actionParams.priority as Priority | undefined;
      if (p && task.priority !== p) return { priority: p };
      return null;
    }
    case "move_to_column": {
      const c = rule.actionParams.column;
      if (c && task.column !== c) return { column: c };
      return null;
    }
    case "add_assignee": {
      const a = rule.actionParams.assignee;
      if (a && !task.admins.includes(a)) {
        return { admin: [...task.admins, a].join(",") };
      }
      return null;
    }
    case "archive": {
      if (!task.isArchived) return { is_archived: true };
      return null;
    }
    case "notify":
      return null;
    default:
      return null;
  }
}
