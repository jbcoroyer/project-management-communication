"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import type { ProjectedWorkItem, Task } from "../../lib/types";
import { computeSlotHours, HALF_HOUR_OPTIONS } from "../../lib/projectedWorkUtils";

type Props = {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onSave: (items: ProjectedWorkItem[]) => Promise<void>;
};

export default function EventTaskPlanningModal(props: Props) {
  const { open, task, onClose, onSave } = props;
  const [items, setItems] = useState<ProjectedWorkItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && task) {
      setItems([...(task.projectedWork ?? [])]);
    }
  }, [open, task]);

  if (!open || !task) return null;

  const deadlineOrToday = task.deadline || new Date().toISOString().slice(0, 10);

  const handleSubmit = async () => {
    const normalized = items.map((slot) => ({
      ...slot,
      hours: computeSlotHours(slot),
    }));
    setSaving(true);
    try {
      await onSave(normalized);
      onClose();
    } catch {
      /* erreur déjà signalée par la page */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-950/40" aria-label="Fermer" onClick={onClose} />
      <div className="relative z-10 flex max-h-[min(90vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/50">Créneaux calendrier</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-[var(--foreground)]">{task.projectName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-1.5 text-[color:var(--foreground)]/60 hover:bg-[var(--surface)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setItems((prev) => [...prev, { date: deadlineOrToday, hours: 2 }])
              }
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1 text-xs font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
            >
              <Plus className="h-3.5 w-3.5" />
              Jour (durée)
            </button>
            <button
              type="button"
              onClick={() =>
                setItems((prev) => [
                  ...prev,
                  {
                    date: deadlineOrToday,
                    startTime: "08:00",
                    endTime: "10:00",
                    hours: 2,
                  },
                ])
              }
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1 text-xs font-semibold text-[color:var(--foreground)]/70 hover:bg-[var(--surface)]"
            >
              <Plus className="h-3.5 w-3.5" />
              Créneau horaire
            </button>
          </div>

          {items.length === 0 ? (
            <p className="text-xs text-[color:var(--foreground)]/45">Aucun créneau. Ajoutez une journée ou un créneau.</p>
          ) : (
            <div className="space-y-2">
              {items.map((slot, index) => {
                const isDayOnly = !slot.startTime && !slot.endTime;
                return (
                  <div
                    key={`${slot.date}-${index}`}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-2 text-xs"
                  >
                    <input
                      type="date"
                      value={slot.date}
                      onChange={(e) =>
                        setItems((prev) => prev.map((p, i) => (i === index ? { ...p, date: e.target.value } : p)))
                      }
                      className="ui-focus-ring rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-1"
                    />
                    {isDayOnly ? (
                      <>
                        <label className="inline-flex items-center gap-1 text-[color:var(--foreground)]/65">
                          h
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={slot.hours ?? 0}
                            onChange={(e) =>
                              setItems((prev) =>
                                prev.map((p, i) =>
                                  i === index ? { ...p, hours: parseFloat(e.target.value) || 0 } : p,
                                ),
                              )
                            }
                            className="ui-focus-ring w-16 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-1"
                          />
                        </label>
                        <span className="rounded-md border border-[var(--line)]/85 bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--foreground)]/75">
                          Journée
                        </span>
                      </>
                    ) : (
                      <>
                        <select
                          value={slot.startTime ?? "08:00"}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((p, i) => (i === index ? { ...p, startTime: e.target.value } : p)),
                            )
                          }
                          className="ui-focus-ring rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-1"
                        >
                          {HALF_HOUR_OPTIONS.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                        <span className="text-[color:var(--foreground)]/50">→</span>
                        <select
                          value={slot.endTime ?? "10:00"}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((p, i) => (i === index ? { ...p, endTime: e.target.value } : p)),
                            )
                          }
                          className="ui-focus-ring rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-1"
                        >
                          {HALF_HOUR_OPTIONS.map((time) => (
                            <option key={time} value={time}>
                              {time}
                            </option>
                          ))}
                        </select>
                        <span className="rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1 text-[color:var(--foreground)]/60">
                          {computeSlotHours(slot)} h
                        </span>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                      className="ml-auto rounded-md px-2 py-1 text-rose-600 hover:bg-rose-50"
                    >
                      Supprimer
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--line)] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[color:var(--foreground)]/70 hover:bg-[var(--surface)]"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSubmit()}
            className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#fffdf9] hover:bg-[var(--accent-strong)] disabled:opacity-60"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
