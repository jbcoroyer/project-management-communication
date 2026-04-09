import {
  priorities,
  defaultColumns,
  defaultCompanies,
  defaultDomains,
  type AdminId,
  type ColumnId,
  type Company,
  type Domain,
  type Priority,
  type ProjectedWorkItem,
  type Task,
} from "./types";

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function parseProjectedWork(raw: unknown): ProjectedWorkItem[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item) => item != null && typeof item === "object")
    .map((item) => {
      const obj = item as Record<string, unknown>;
      const date = typeof obj.date === "string" ? obj.date : "";
      const startTime = typeof obj.startTime === "string" ? obj.startTime : undefined;
      const endTime = typeof obj.endTime === "string" ? obj.endTime : undefined;
      let hours = toNumber(obj.hours);
      if (hours <= 0 && startTime && endTime) {
        const [sh, sm] = startTime.split(":").map(Number);
        const [eh, em] = endTime.split(":").map(Number);
        if (Number.isFinite(sh) && Number.isFinite(sm) && Number.isFinite(eh) && Number.isFinite(em)) {
          const diff = (eh * 60 + em) - (sh * 60 + sm);
          hours = diff > 0 ? diff / 60 : 0;
        }
      }
      return { date, hours, startTime, endTime };
    })
    .filter((item) => item.date && item.hours > 0);
}

export function mapTaskRow(row: unknown): Task {
  const r = row as Record<string, unknown>;

  const rawCompany = r.company;
  const company: Company = typeof rawCompany === "string" && rawCompany.trim() ? rawCompany : defaultCompanies[0];

  const rawDomain = r.domain;
  const domain: Domain = typeof rawDomain === "string" && rawDomain.trim() ? rawDomain : defaultDomains[0];

  const rawPriority = r.priority;
  const priority: Priority =
    typeof rawPriority === "string" && (priorities as readonly string[]).includes(rawPriority)
      ? (rawPriority as Priority)
      : "Moyenne";

  const rawColumn = r.column_id;
  const column: ColumnId =
    typeof rawColumn === "string" && rawColumn.trim() ? rawColumn : defaultColumns[0];

  const adminCsv = r.admin;
  const parsedAdminsRaw: AdminId[] =
    typeof adminCsv === "string" && adminCsv.trim().length > 0
      ? adminCsv
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean)
      : [];
  const parsedAdmins = parsedAdminsRaw.length > 0 ? parsedAdminsRaw : [];

  const lastStartTime =
    typeof r.last_start_time_ms === "number" && Number.isFinite(r.last_start_time_ms)
      ? r.last_start_time_ms
      : undefined;

  const completedAtRaw = r.completed_at;
  const completedAt =
    typeof completedAtRaw === "string" && completedAtRaw.trim() ? completedAtRaw : undefined;

  return {
    id: String(r.id ?? ""),
    createdAt: typeof r.created_at === "string" ? r.created_at : undefined,
    completedAt,
    projectName: typeof r.project_name === "string" ? r.project_name : "",
    company,
    domain,
    admins: parsedAdmins,
    isClientRequest: typeof r.is_client_request === "boolean" ? r.is_client_request : false,
    clientName: typeof r.client_name === "string" ? r.client_name : "",
    requestDate: typeof r.request_date === "string" ? r.request_date : "",
    deadline: typeof r.deadline === "string" ? r.deadline : "",
    budget: typeof r.budget === "string" ? r.budget : "",
    description: typeof r.description === "string" ? r.description : "",
    column,
    priority,
    projectedWork: parseProjectedWork(r.projected_work),
    elapsedMs: toNumber(r.elapsed_ms),
    isRunning: typeof r.is_running === "boolean" ? r.is_running : false,
    lastStartTime,
    isArchived: typeof r.is_archived === "boolean" ? r.is_archived : false,
    estimatedHours: toNumber(r.estimated_hours),
    estimatedDays: toNumber(r.estimated_days),
    parentTaskId: typeof r.parent_task_id === "string" && r.parent_task_id ? r.parent_task_id : undefined,
    eventId: typeof r.event_id === "string" && r.event_id ? r.event_id : undefined,
    eventCategory: typeof r.event_category === "string" && r.event_category.trim() ? r.event_category : null,
    eventName: parseEventName(r.events),
  };
}

function parseEventName(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "object" && !Array.isArray(raw) && "name" in raw) {
    const n = (raw as { name?: unknown }).name;
    return typeof n === "string" && n.trim() ? n.trim() : null;
  }
  if (Array.isArray(raw) && raw[0] && typeof raw[0] === "object" && "name" in raw[0]) {
    const n = (raw[0] as { name?: unknown }).name;
    return typeof n === "string" && n.trim() ? n.trim() : null;
  }
  return null;
}

