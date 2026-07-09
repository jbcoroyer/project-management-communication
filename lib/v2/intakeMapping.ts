import type { IntakeRequest } from "./intake";
import type { Priority } from "../types";
import { suggestDomainFromText } from "./intake";
import { suggestAssignee } from "./triage";
import type { Task } from "../types";

export type IntakeTaskDraft = {
  projectName: string;
  company: string;
  domain: string;
  admins: string[];
  deadline: string;
  budget: string;
  description: string;
  priority: Priority;
  estimatedHours: number;
  isClientRequest: boolean;
  clientName: string;
};

export function buildTaskDraftFromRequest(
  request: IntakeRequest,
  options: {
    companies: string[];
    domains: string[];
    admins: string[];
    tasks: Task[];
    defaultAdmin?: string;
  },
): IntakeTaskDraft {
  const domainText = `${request.title} ${request.concern} ${request.supportFormat} ${request.description}`;
  const domain =
    request.suggestedDomain && options.domains.includes(request.suggestedDomain)
      ? request.suggestedDomain
      : suggestDomainFromText(domainText);

  const assignee =
    request.suggestedAssignee ??
    suggestAssignee(request, options.tasks, options.admins) ??
    options.defaultAdmin ??
    "";

  const descriptionParts = [
    request.concern ? `Support attendu : ${request.concern}` : "",
    request.supportFormat ? `Format : ${request.supportFormat}` : "",
    request.description.trim(),
    request.requesterName || request.requesterService
      ? `Demandeur : ${request.requesterName || "—"}${request.requesterService ? ` (${request.requesterService})` : ""}`
      : "",
  ].filter(Boolean);

  return {
    projectName: request.title,
    company:
      request.company && options.companies.includes(request.company)
        ? request.company
        : options.companies[0] ?? "IDENA",
    domain: options.domains.includes(domain) ? domain : options.domains[0] ?? domain,
    admins: assignee ? [assignee] : [],
    deadline: request.deadline,
    budget: request.budget ?? "",
    description: descriptionParts.join("\n\n"),
    priority: request.priority,
    estimatedHours: request.estimatedHours ?? 0,
    isClientRequest: true,
    clientName: request.requesterName || request.requesterService || "",
  };
}
