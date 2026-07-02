"use client";

import { useState } from "react";
import { Archive, Bolt, Database, HardDrive, Plus, Power, Trash2 } from "lucide-react";
import { priorities } from "../../../lib/types";
import {
  ACTION_LABELS,
  TRIGGER_LABELS,
  useAutomationRules,
  type AutomationActionType,
  type AutomationRule,
  type AutomationTriggerType,
} from "../../../lib/v2/automations";
import { useAutoArchiveHours } from "../../../lib/v2/v2Preferences";

const TRIGGER_TYPES = Object.keys(TRIGGER_LABELS) as AutomationTriggerType[];
const ACTION_TYPES = Object.keys(ACTION_LABELS) as AutomationActionType[];

function ruleSummary(rule: AutomationRule): string {
  const trigger = TRIGGER_LABELS[rule.triggerType];
  const triggerDetail = rule.triggerParams.column
    ? ` « ${rule.triggerParams.column} »`
    : rule.triggerParams.domain
      ? ` (${rule.triggerParams.domain})`
      : "";
  const action = ACTION_LABELS[rule.actionType];
  const actionDetail =
    rule.actionParams.priority ||
    rule.actionParams.column ||
    rule.actionParams.assignee ||
    rule.actionParams.message ||
    "";
  return `${trigger}${triggerDetail} → ${action}${actionDetail ? ` : ${actionDetail}` : ""}`;
}

export default function AutomationsManager({
  columns,
  domains,
  admins,
}: {
  columns: string[];
  domains: string[];
  admins: string[];
}) {
  const { rules, backend, loading, createRule, updateRule, deleteRule } = useAutomationRules();
  const [autoArchiveHours, setAutoArchiveHours] = useAutoArchiveHours();

  const [name, setName] = useState("");
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>("moved_to_column");
  const [triggerColumn, setTriggerColumn] = useState(columns[0] ?? "En validation");
  const [triggerDomain, setTriggerDomain] = useState(domains[0] ?? "");
  const [actionType, setActionType] = useState<AutomationActionType>("set_priority");
  const [actionPriority, setActionPriority] = useState<string>(priorities[0]);
  const [actionColumn, setActionColumn] = useState(columns[0] ?? "En cours");
  const [actionAssignee, setActionAssignee] = useState(admins[0] ?? "");
  const [actionMessage, setActionMessage] = useState("");

  const submit = async () => {
    const triggerParams: Record<string, string> = {};
    if (triggerType === "moved_to_column") triggerParams.column = triggerColumn;
    if (triggerType === "task_created" && triggerDomain) triggerParams.domain = triggerDomain;

    const actionParams: Record<string, string> = {};
    if (actionType === "set_priority") actionParams.priority = actionPriority;
    if (actionType === "move_to_column") actionParams.column = actionColumn;
    if (actionType === "add_assignee") actionParams.assignee = actionAssignee;
    if (actionType === "notify" && actionMessage) actionParams.message = actionMessage;

    await createRule({
      enabled: true,
      name: name.trim() || "Automatisation",
      triggerType,
      triggerParams,
      actionType,
      actionParams,
    });
    setName("");
  };

  return (
    <div className="space-y-5">
      <div className="ui-surface rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Bolt className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Automatisations</h2>
              <p className="text-xs text-[color:var(--foreground)]/55">
                Règles « si… alors… » appliquées en temps réel au tableau.
              </p>
            </div>
          </div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--foreground)]/60"
            title={
              backend === "supabase"
                ? "Règles partagées (table Supabase)"
                : "Stockage local — appliquez la migration pour le mode partagé"
            }
          >
            {backend === "supabase" ? <Database className="h-3.5 w-3.5" /> : <HardDrive className="h-3.5 w-3.5" />}
            {backend === "supabase" ? "Partagé" : "Local"}
          </span>
        </div>

        {backend === "local" ? (
          <p className="mt-3 rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--surface-soft)] px-3 py-2 text-[11px] text-[color:var(--foreground)]/65">
            Mode local (par appareil). Pour partager les règles à toute l'équipe, appliquez la migration&nbsp;:
            <code className="ml-1 rounded bg-[var(--surface)] px-1">npm run db:v2-automations-intake</code>
          </p>
        ) : null}

        <div className="mt-4 grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/70 sm:col-span-2">
            Nom
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex. Prioriser les validations"
              className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/70">
            Déclencheur
            <select
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value as AutomationTriggerType)}
              className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
            >
              {TRIGGER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TRIGGER_LABELS[t]}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/70">
            Paramètre
            {triggerType === "moved_to_column" ? (
              <select
                value={triggerColumn}
                onChange={(e) => setTriggerColumn(e.target.value)}
                className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
              >
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : triggerType === "task_created" ? (
              <select
                value={triggerDomain}
                onChange={(e) => setTriggerDomain(e.target.value)}
                className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
              >
                <option value="">Tous les domaines</option>
                {domains.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            ) : (
              <span className="rounded-lg border border-dashed border-[var(--line)] px-3 py-2 text-sm font-normal text-[color:var(--foreground)]/45">
                Aucun
              </span>
            )}
          </div>

          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/70">
            Action
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value as AutomationActionType)}
              className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
            >
              {ACTION_TYPES.map((a) => (
                <option key={a} value={a}>
                  {ACTION_LABELS[a]}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/70">
            Paramètre
            {actionType === "set_priority" ? (
              <select
                value={actionPriority}
                onChange={(e) => setActionPriority(e.target.value)}
                className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
              >
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            ) : actionType === "move_to_column" ? (
              <select
                value={actionColumn}
                onChange={(e) => setActionColumn(e.target.value)}
                className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
              >
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : actionType === "add_assignee" ? (
              <select
                value={actionAssignee}
                onChange={(e) => setActionAssignee(e.target.value)}
                className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
              >
                {admins.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            ) : actionType === "notify" ? (
              <input
                value={actionMessage}
                onChange={(e) => setActionMessage(e.target.value)}
                placeholder="Message de notification"
                className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
              />
            ) : (
              <span className="rounded-lg border border-dashed border-[var(--line)] px-3 py-2 text-sm font-normal text-[color:var(--foreground)]/45">
                Aucun
              </span>
            )}
          </div>

          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={() => void submit()}
              className="ui-transition inline-flex items-center gap-2 rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-strong)]"
            >
              <Plus className="h-4 w-4" /> Ajouter la règle
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {loading ? (
            <p className="text-sm text-[color:var(--foreground)]/55">Chargement…</p>
          ) : rules.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-6 text-center text-sm text-[color:var(--foreground)]/55">
              Aucune automatisation. Créez votre première règle ci-dessus.
            </p>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5"
              >
                <button
                  type="button"
                  onClick={() => void updateRule(rule.id, { enabled: !rule.enabled })}
                  title={rule.enabled ? "Désactiver" : "Activer"}
                  className={[
                    "ui-transition flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                    rule.enabled
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "border-[var(--line)] text-[color:var(--foreground)]/40",
                  ].join(" ")}
                >
                  <Power className="h-4 w-4" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--foreground)]">{rule.name}</p>
                  <p className="truncate text-[11px] text-[color:var(--foreground)]/55">{ruleSummary(rule)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void deleteRule(rule.id)}
                  className="ui-transition shrink-0 rounded-lg border border-transparent p-1.5 text-[color:var(--foreground)]/50 hover:border-[var(--line)] hover:text-[var(--danger)]"
                  aria-label="Supprimer la règle"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="ui-surface rounded-2xl p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-[color:var(--foreground)]/60">
            <Archive className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">Auto-archivage</h2>
            <p className="text-xs text-[color:var(--foreground)]/55">
              Archiver les tâches « Terminé » après un délai.
            </p>
          </div>
        </div>
        <label className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[var(--foreground)]">
          Archiver après
          <input
            type="number"
            min={1}
            max={24}
            value={autoArchiveHours}
            onChange={(e) => setAutoArchiveHours(Number(e.target.value))}
            className="ui-focus-ring w-20 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
          heures (max 24)
        </label>
      </div>
    </div>
  );
}
