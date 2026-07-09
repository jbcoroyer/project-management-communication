"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { priorities, type Priority } from "../../../lib/types";
import type { IntakeTaskDraft } from "../../../lib/v2/intakeMapping";

export default function IntakeTaskMappingModal({
  open,
  draft,
  companies,
  domains,
  admins,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  draft: IntakeTaskDraft | null;
  companies: string[];
  domains: string[];
  admins: string[];
  busy?: boolean;
  onClose: () => void;
  onConfirm: (mapped: IntakeTaskDraft) => void;
}) {
  const [form, setForm] = useState<IntakeTaskDraft | null>(draft);

  useEffect(() => {
    if (open && draft) setForm(draft);
  }, [open, draft]);

  if (!open || !form) return null;

  const set = <K extends keyof IntakeTaskDraft>(key: K, value: IntakeTaskDraft[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  return (
    <div className="fixed inset-0 z-[calc(var(--z-overlay)+5)] flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-2)]"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Créer la tâche depuis la demande</h2>
            <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
              Renseignez le budget, la charge estimée et la priorité avant de créer la tâche dans le Kanban.
            </p>
          </div>
          <button type="button" onClick={onClose} className="ui-transition rounded-lg p-1.5 text-[color:var(--foreground)]/50 hover:bg-[var(--surface-soft)]" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-[11px] font-semibold text-[color:var(--foreground)]/55">Titre de la tâche</span>
            <input
              value={form.projectName}
              onChange={(e) => set("projectName", e.target.value)}
              className="ui-focus-ring mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-semibold text-[color:var(--foreground)]/55">Entité</span>
              <select
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
                className="ui-focus-ring mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                {companies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-[color:var(--foreground)]/55">Domaine</span>
              <select
                value={form.domain}
                onChange={(e) => set("domain", e.target.value)}
                className="ui-focus-ring mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                {domains.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-semibold text-[color:var(--foreground)]/55">Échéance *</span>
              <input
                type="date"
                required
                value={form.deadline}
                onChange={(e) => set("deadline", e.target.value)}
                className="ui-focus-ring mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-[color:var(--foreground)]/55">Priorité</span>
              <select
                value={form.priority}
                onChange={(e) => set("priority", e.target.value as Priority)}
                className="ui-focus-ring mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
              >
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-[11px] font-semibold text-[color:var(--foreground)]/55">Assigné(s)</span>
            <select
              value={form.admins[0] ?? ""}
              onChange={(e) => set("admins", e.target.value ? [e.target.value] : [])}
              className="ui-focus-ring mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
            >
              <option value="">Non assigné</option>
              {admins.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-semibold text-[color:var(--foreground)]/55">Budget</span>
              <input
                value={form.budget}
                onChange={(e) => set("budget", e.target.value)}
                placeholder="Ex. 2 500 €"
                className="ui-focus-ring mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-[color:var(--foreground)]/55">Charge estimée (heures)</span>
              <input
                type="number"
                min={0}
                step={0.5}
                value={form.estimatedHours || ""}
                onChange={(e) => set("estimatedHours", Number(e.target.value) || 0)}
                className="ui-focus-ring mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[11px] font-semibold text-[color:var(--foreground)]/55">Client / demandeur</span>
            <input
              value={form.clientName}
              onChange={(e) => set("clientName", e.target.value)}
              className="ui-focus-ring mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold text-[color:var(--foreground)]/55">Description</span>
            <textarea
              rows={5}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="ui-focus-ring mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="ui-transition rounded-xl border border-[var(--line-strong)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)]/70 hover:bg-[var(--surface-soft)]"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={busy || !form.projectName.trim() || !form.deadline}
            onClick={() => onConfirm(form)}
            className="ui-transition rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-strong)] disabled:opacity-50"
          >
            {busy ? "Création…" : "Créer la tâche"}
          </button>
        </div>
      </div>
    </div>
  );
}
