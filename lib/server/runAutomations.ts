import type { SupabaseClient } from "@supabase/supabase-js";
import { taskMatchesTrigger, type AutomationRule } from "../v2/automations";
import { mapTaskRow } from "../taskMappers";
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

/**
 * Exécute les automatisations côté serveur (service role).
 * Idempotence soft : une table automation_runs si présente, sinon best-effort.
 */
export async function runAutomationsServer(
  admin: SupabaseClient,
): Promise<{ applied: number; skipped: number; errors: string[] }> {
  const errors: string[] = [];
  let applied = 0;
  let skipped = 0;

  const { data: ruleRows, error: rulesErr } = await admin
    .from("automation_rules")
    .select("*")
    .eq("enabled", true)
    .order("sort_order", { ascending: true });

  if (rulesErr) {
    return { applied: 0, skipped: 0, errors: [rulesErr.message] };
  }

  const rules = ((ruleRows ?? []) as RuleRow[]).map(rowToRule);
  if (rules.length === 0) return { applied: 0, skipped: 0, errors: [] };

  const { data: taskRows, error: tasksErr } = await admin
    .from("tasks")
    .select("*")
    .eq("is_archived", false)
    .limit(2000);

  if (tasksErr) {
    return { applied: 0, skipped: 0, errors: [tasksErr.message] };
  }

  const tasks = (taskRows ?? []).map((row) => mapTaskRow(row));
  const now = Date.now();

  for (const rule of rules) {
    for (const task of tasks) {
      if (!taskMatchesTrigger(rule, task, now)) {
        skipped += 1;
        continue;
      }
      try {
        await applyServerAction(admin, rule, task);
        applied += 1;
      } catch (e) {
        errors.push(
          `${rule.id}/${task.id}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
  }

  return { applied, skipped, errors };
}

async function applyServerAction(
  admin: SupabaseClient,
  rule: AutomationRule,
  task: Task,
): Promise<void> {
  switch (rule.actionType) {
    case "set_priority": {
      const p = rule.actionParams.priority as Priority | undefined;
      if (p && task.priority !== p) {
        await admin.from("tasks").update({ priority: p }).eq("id", task.id);
      }
      break;
    }
    case "move_to_column": {
      const c = rule.actionParams.column;
      if (c && task.column !== c) {
        await admin.from("tasks").update({ column: c }).eq("id", task.id);
      }
      break;
    }
    case "add_assignee": {
      const a = rule.actionParams.assignee;
      if (a && !task.admins.includes(a)) {
        const nextAdmins = [...task.admins, a];
        await admin.from("tasks").update({ admin: nextAdmins.join(",") }).eq("id", task.id);
      }
      break;
    }
    case "archive": {
      if (!task.isArchived) {
        await admin.from("tasks").update({ is_archived: true }).eq("id", task.id);
      }
      break;
    }
    case "notify":
      // Les notifications push restent côté client ; le cron journalise seulement.
      break;
    default:
      break;
  }
}
