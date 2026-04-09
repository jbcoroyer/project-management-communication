"use client";

import { useRef, useState } from "react";
import { X } from "lucide-react";
import { createEventWithTasks } from "../../app/actions/events";
import { eventStatuses, type EventStatus } from "../../lib/eventTypes";
import { toastError, toastSuccess } from "../../lib/toast";

type CreateEventModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (eventId: string) => void;
};

export default function CreateEventModal(props: CreateEventModalProps) {
  const { open, onClose, onCreated } = props;
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<EventStatus>("Brouillon");
  const [allocatedBudget, setAllocatedBudget] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  /** Verrou synchrone : plusieurs clics peuvent passer avant le re-render de `submitting`. */
  const submitLockRef = useRef(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current || submitting) {
      return;
    }
    if (!name.trim()) {
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
    submitLockRef.current = true;
    setSubmitting(true);
    try {
      const result = await createEventWithTasks({
        name: name.trim(),
        location: location.trim(),
        startDate,
        endDate,
        status,
        allocatedBudget: Number(allocatedBudget.replace(",", ".")) || 0,
      });
      if (!result.ok) {
        toastError(result.error);
        return;
      }
      toastSuccess("Événement créé");
      onCreated(result.eventId);
      setName("");
      setLocation("");
      setStartDate("");
      setEndDate("");
      setStatus("Brouillon");
      setAllocatedBudget("0");
      onClose();
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(ev) => ev.target === ev.currentTarget && onClose()}
    >
      <div className="ui-surface w-full max-w-lg rounded-[28px] p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/50">
              Nouvel événement
            </p>
            <h2 className="ui-heading mt-1 text-2xl font-semibold text-[var(--foreground)]">Créer un salon</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-transition rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2 text-[color:var(--foreground)]/60 hover:bg-[var(--surface-soft)]"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          autoComplete="off"
          aria-busy={submitting}
        >
          <div>
            <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Nom du salon</label>
            <input
              value={name}
              onChange={(ev) => setName(ev.target.value)}
              className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              placeholder="Ex. Salon de l'emploi 2026"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Lieu</label>
            <input
              value={location}
              onChange={(ev) => setLocation(ev.target.value)}
              className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              placeholder="Ville, hall, adresse"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Début</label>
              <input
                type="date"
                value={startDate}
                onChange={(ev) => setStartDate(ev.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(ev) => setEndDate(ev.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Statut</label>
              <select
                value={status}
                onChange={(ev) => setStatus(ev.target.value as EventStatus)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              >
                {eventStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Budget alloué (€)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={allocatedBudget}
                onChange={(ev) => setAllocatedBudget(ev.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="ui-transition rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="ui-transition rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#fffdf9] shadow-sm hover:bg-[var(--accent-strong)] disabled:opacity-60"
            >
              {submitting ? "Création…" : "Créer l'événement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
