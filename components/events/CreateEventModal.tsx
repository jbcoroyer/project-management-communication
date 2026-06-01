"use client";

import { useRef, useState } from "react";
import { Copy, X } from "lucide-react";
import { createEventWithTasks, duplicateEvent } from "../../app/actions/events";
import { eventChecklistTemplates } from "../../lib/eventChecklistTemplates";
import { eventStatuses, type EventRow, type EventStatus } from "../../lib/eventTypes";
import { toastError, toastSuccess } from "../../lib/toast";

type CreateEventModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (eventId: string) => void;
  existingEvents?: EventRow[];
  defaultAdminName?: string;
};

export default function CreateEventModal(props: CreateEventModalProps) {
  const { open, onClose, onCreated, existingEvents = [], defaultAdminName = "" } = props;
  const [mode, setMode] = useState<"new" | "duplicate">("new");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<EventStatus>("Brouillon");
  const [allocatedBudget, setAllocatedBudget] = useState("0");
  const [templateKey, setTemplateKey] = useState(eventChecklistTemplates[0]?.key ?? "");
  const [sourceEventId, setSourceEventId] = useState("");
  const [copyTasks, setCopyTasks] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const submitLockRef = useRef(false);

  if (!open) return null;

  const resetForm = () => {
    setName("");
    setLocation("");
    setStartDate("");
    setEndDate("");
    setStatus("Brouillon");
    setAllocatedBudget("0");
    setTemplateKey(eventChecklistTemplates[0]?.key ?? "");
    setSourceEventId("");
    setCopyTasks(true);
    setMode("new");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current || submitting) return;
    if (!name.trim() && mode === "new") {
      toastError("Indiquez le nom du salon.");
      return;
    }
    if (!startDate || !endDate) {
      toastError("Indiquez les dates de début et de fin.");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      toastError("La date de fin doit être après la date de début.");
      return;
    }
    if (mode === "duplicate" && !sourceEventId) {
      toastError("Choisissez un événement à dupliquer.");
      return;
    }
    if (mode === "new" && templateKey && !defaultAdminName.trim()) {
      toastError("Configurez au moins un collaborateur actif pour générer la checklist.");
      return;
    }

    submitLockRef.current = true;
    setSubmitting(true);
    try {
      if (mode === "duplicate") {
        const result = await duplicateEvent({
          sourceEventId,
          name: name.trim() || "Salon (copie)",
          startDate,
          endDate,
          copyTasks,
        });
        if (!result.ok) {
          toastError(result.error);
          return;
        }
        toastSuccess("Événement dupliqué");
        onCreated(result.eventId);
        resetForm();
        onClose();
        return;
      }

      const result = await createEventWithTasks({
        name: name.trim(),
        location: location.trim(),
        startDate,
        endDate,
        status,
        allocatedBudget: Number(allocatedBudget.replace(",", ".")) || 0,
        templateKey: templateKey || null,
        defaultAdminName: defaultAdminName.trim(),
      });
      if (!result.ok) {
        toastError(result.error);
        return;
      }
      toastSuccess(
        templateKey ? "Événement et checklist créés" : "Événement créé",
      );
      onCreated(result.eventId);
      resetForm();
      onClose();
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  const duplicateSources = [...existingEvents].sort((a, b) =>
    b.startDate.localeCompare(a.startDate),
  );

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(ev) => ev.target === ev.currentTarget && onClose()}
    >
      <div className="ui-surface max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/50">
              {mode === "duplicate" ? "Dupliquer" : "Nouvel événement"}
            </p>
            <h2 className="ui-heading mt-1 text-2xl font-semibold text-[var(--foreground)]">
              {mode === "duplicate" ? "Créer à partir d'un salon" : "Créer un salon"}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--line)] p-2" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 flex gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-1">
          <button
            type="button"
            onClick={() => setMode("new")}
            className={[
              "flex-1 rounded-lg py-2 text-sm font-semibold",
              mode === "new" ? "bg-[var(--foreground)] text-[var(--accent-contrast)]" : "",
            ].join(" ")}
          >
            Nouveau
          </button>
          <button
            type="button"
            onClick={() => setMode("duplicate")}
            className={[
              "flex-1 inline-flex items-center justify-center gap-1 rounded-lg py-2 text-sm font-semibold",
              mode === "duplicate" ? "bg-[var(--foreground)] text-[var(--accent-contrast)]" : "",
            ].join(" ")}
          >
            <Copy className="h-3.5 w-3.5" />
            Dupliquer
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "duplicate" ? (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                  Salon source
                </label>
                <select
                  value={sourceEventId}
                  onChange={(e) => setSourceEventId(e.target.value)}
                  className="ui-focus-ring w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm"
                >
                  <option value="">Choisir…</option>
                  {duplicateSources.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} ({ev.startDate})
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={copyTasks}
                  onChange={(e) => setCopyTasks(e.target.checked)}
                />
                Recopier les tâches (échéances recalées)
              </label>
            </>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Modèle de checklist
              </label>
              <select
                value={templateKey}
                onChange={(e) => setTemplateKey(e.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm"
              >
                <option value="">Aucune (tâches vides)</option>
                {eventChecklistTemplates.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label} ({t.tasks.length} tâches)
                  </option>
                ))}
              </select>
              {templateKey ? (
                <p className="mt-1 text-xs text-[color:var(--foreground)]/55">
                  {eventChecklistTemplates.find((t) => t.key === templateKey)?.description}
                </p>
              ) : null}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Nom du salon</label>
            <input
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              className="ui-focus-ring w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm"
              placeholder={mode === "duplicate" ? "Laisser vide = nom + (copie)" : "Ex. Salon 2026"}
            />
          </div>
          {mode === "new" ? (
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Lieu</label>
              <input
                value={location}
                onChange={(ev) => setLocation(ev.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm"
              />
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Début</label>
              <input
                type="date"
                value={startDate}
                onChange={(ev) => setStartDate(ev.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(ev) => setEndDate(ev.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm"
              />
            </div>
          </div>
          {mode === "new" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Statut</label>
                <select
                  value={status}
                  onChange={(ev) => setStatus(ev.target.value as EventStatus)}
                  className="ui-focus-ring w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm"
                >
                  {eventStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Budget (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={allocatedBudget}
                  onChange={(ev) => setAllocatedBudget(ev.target.value)}
                  className="ui-focus-ring w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm"
                />
              </div>
            </div>
          ) : null}
          <div className="flex justify-end gap-2 border-t border-[var(--line)] pt-4">
            <button type="button" onClick={onClose} className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-semibold">
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-60"
            >
              {submitting ? "Création…" : mode === "duplicate" ? "Dupliquer" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
