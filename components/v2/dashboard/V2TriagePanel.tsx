"use client";

import { AlertTriangle, Check, Database, HardDrive, Inbox, Sparkles, UserCheck, X } from "lucide-react";
import type { IntakeBackend, IntakeRequest } from "../../../lib/v2/intake";
import type { Task } from "../../../lib/types";
import { findDuplicateTasks, suggestAssignee } from "../../../lib/v2/triage";

function formatDeadline(value: string): string {
  if (!value) return "—";
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("fr-FR");
}

export default function V2TriagePanel({
  requests,
  backend,
  loading,
  tasks = [],
  admins = [],
  onAccept,
  onReject,
  onOpenTask,
}: {
  requests: IntakeRequest[];
  backend: IntakeBackend;
  loading: boolean;
  tasks?: Task[];
  admins?: string[];
  onAccept: (request: IntakeRequest) => void;
  onReject: (request: IntakeRequest) => void;
  onOpenTask?: (taskId: string) => void;
}) {
  const pending = requests.filter((r) => r.status === "triage");
  const decided = requests.filter((r) => r.status !== "triage").slice(0, 8);

  return (
    <div className="space-y-5">
      <section className="ui-surface rounded-2xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Inbox className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Triage des demandes</h2>
              <p className="text-xs text-[color:var(--foreground)]/55">
                {pending.length} demande{pending.length !== 1 ? "s" : ""} à qualifier
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--foreground)]/60">
            {backend === "supabase" ? <Database className="h-3.5 w-3.5" /> : <HardDrive className="h-3.5 w-3.5" />}
            {backend === "supabase" ? "Partagé" : "Local"}
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-[color:var(--foreground)]/55">Chargement…</p>
        ) : pending.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-10 text-center">
            <Check className="mx-auto h-8 w-8 text-[var(--success)]" />
            <p className="mt-2 text-sm font-medium text-[var(--foreground)]">Aucune demande en attente</p>
            <p className="mt-1 text-xs text-[color:var(--foreground)]/55">
              Les demandes soumises via le portail apparaîtront ici.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {pending.map((request) => {
              const duplicates = findDuplicateTasks(request, tasks);
              const assignee = request.suggestedAssignee ?? suggestAssignee(request, tasks, admins);
              return (
              <li
                key={request.id}
                className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--foreground)]">{request.title}</p>
                    {request.description ? (
                      <p className="mt-1 text-xs leading-relaxed text-[color:var(--foreground)]/60">
                        {request.description}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                      {request.company ? (
                        <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 font-semibold text-[color:var(--foreground)]/70">
                          {request.company}
                        </span>
                      ) : null}
                      {request.concern ? (
                        <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[color:var(--foreground)]/60">
                          Support : {request.concern}
                        </span>
                      ) : null}
                      {request.supportFormat ? (
                        <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[color:var(--foreground)]/60">
                          Format : {request.supportFormat}
                        </span>
                      ) : null}
                      <span className="rounded-full border border-[var(--accent)]/30 bg-[var(--accent-soft)] px-2 py-0.5 font-semibold text-[var(--accent)]">
                        Échéance {formatDeadline(request.deadline)}
                      </span>
                      {request.requesterName ? (
                        <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[color:var(--foreground)]/60">
                          {request.requesterName}
                        </span>
                      ) : null}
                      {request.suggestedDomain ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 font-semibold text-[var(--accent)]">
                          <Sparkles className="h-3 w-3" /> {request.suggestedDomain}
                        </span>
                      ) : null}
                      {assignee ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 font-semibold text-[var(--accent)]">
                          <UserCheck className="h-3 w-3" /> {assignee}
                        </span>
                      ) : null}
                    </div>
                    {duplicates.length > 0 ? (
                      <div className="mt-2 rounded-lg border border-[var(--warning)]/40 bg-amber-50 p-2">
                        <p className="flex items-center gap-1 text-[11px] font-semibold text-amber-800">
                          <AlertTriangle className="h-3 w-3" /> Doublon possible
                        </p>
                        <ul className="mt-1 space-y-0.5">
                          {duplicates.map((d) => (
                            <li key={d.task.id}>
                              <button
                                type="button"
                                onClick={() => onOpenTask?.(d.task.id)}
                                className="ui-transition text-left text-[11px] text-amber-900 underline decoration-dotted hover:text-amber-700"
                              >
                                {d.task.projectName} ({Math.round(d.score * 100)}%)
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => onAccept(request)}
                      className="ui-transition inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-strong)]"
                    >
                      <Check className="h-3.5 w-3.5" /> Créer la tâche
                    </button>
                    <button
                      type="button"
                      onClick={() => onReject(request)}
                      className="ui-transition inline-flex items-center gap-1.5 rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[color:var(--foreground)]/70 hover:text-[var(--danger)]"
                    >
                      <X className="h-3.5 w-3.5" /> Rejeter
                    </button>
                  </div>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </section>

      {decided.length > 0 ? (
        <section className="ui-surface rounded-2xl p-5">
          <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Historique récent</h3>
          <ul className="space-y-1.5">
            {decided.map((request) => (
              <li
                key={request.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs"
              >
                <span className="truncate text-[var(--foreground)]">{request.title}</span>
                <span
                  className={[
                    "shrink-0 rounded-full px-2 py-0.5 font-semibold",
                    request.status === "accepted"
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "bg-[var(--surface-soft)] text-[color:var(--foreground)]/55",
                  ].join(" ")}
                >
                  {request.status === "accepted" ? "Acceptée" : "Rejetée"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
