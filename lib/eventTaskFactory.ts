import { completedAtIsoForNewTaskInColumn } from "./completedAt";
import {
  deadlineFromDaysBeforeStart,
  getEventChecklistTemplate,
  type ChecklistTemplateTask,
} from "./eventChecklistTemplates";
import { defaultCompanies, defaultDomains } from "./types";

const EVENT_DOMAIN = defaultDomains.find((d) => d.includes("Event")) ?? defaultDomains[0];
const INITIAL_COLUMN = "À faire";

export function buildChecklistTaskRows(params: {
  eventId: string;
  startDate: string;
  templateKey: string;
  defaultAdmin: string;
}): Record<string, unknown>[] {
  const template = getEventChecklistTemplate(params.templateKey);
  if (!template) return [];

  return template.tasks.map((t: ChecklistTemplateTask) => ({
    project_name: t.title,
    event_id: params.eventId,
    event_category: t.category,
    company: defaultCompanies[0],
    domain: EVENT_DOMAIN,
    admin: params.defaultAdmin,
    lane: params.defaultAdmin,
    is_client_request: false,
    client_name: "",
    deadline: deadlineFromDaysBeforeStart(params.startDate, t.daysBeforeStart),
    budget: "",
    description: "",
    column_id: INITIAL_COLUMN,
    priority: t.priority ?? "Moyenne",
    projected_work: [],
    elapsed_ms: 0,
    is_running: false,
    last_start_time_ms: null,
    is_archived: false,
    estimated_hours: 0,
    estimated_days: 0,
    completed_at: completedAtIsoForNewTaskInColumn(INITIAL_COLUMN),
  }));
}

export function shiftTaskDeadline(
  oldDeadline: string | null | undefined,
  sourceStart: string,
  targetStart: string,
): string | null {
  if (!oldDeadline?.trim()) return null;
  const oldD = new Date(`${oldDeadline}T12:00:00`);
  const src = new Date(`${sourceStart}T12:00:00`);
  const tgt = new Date(`${targetStart}T12:00:00`);
  if (Number.isNaN(oldD.getTime()) || Number.isNaN(src.getTime()) || Number.isNaN(tgt.getTime())) {
    return oldDeadline;
  }
  const deltaMs = tgt.getTime() - src.getTime();
  const next = new Date(oldD.getTime() + deltaMs);
  return next.toISOString().slice(0, 10);
}
