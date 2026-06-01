"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { closeEventWithRecap } from "../../app/actions/events";
import type { EventClosureRecap, EventRow } from "../../lib/eventTypes";
import { formatCurrency } from "../../lib/stockUtils";
import { toastError, toastSuccess } from "../../lib/toast";

type Props = {
  open: boolean;
  event: EventRow;
  consumedTotal: number;
  expenseTotal: number;
  stockTotal: number;
  taskProgressPct: number;
  onClose: () => void;
  onClosed: () => void;
};

export default function EventClosureRecapModal(props: Props) {
  const { open, event, consumedTotal, expenseTotal, stockTotal, taskProgressPct, onClose, onClosed } =
    props;
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const recap: EventClosureRecap = {
    closedAt: new Date().toISOString(),
    allocatedBudget: event.allocatedBudget,
    consumedTotal,
    expenseTotal,
    stockTotal,
    taskProgressPct,
    notes: notes.trim() || undefined,
  };

  const delta = consumedTotal - event.allocatedBudget;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const r = await closeEventWithRecap({ eventId: event.id, notes }, recap);
      if (!r.ok) {
        toastError(r.error);
        return;
      }
      toastSuccess("Événement clôturé");
      onClosed();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onMouseDown={(ev) => ev.target === ev.currentTarget && onClose()}
    >
      <div className="ui-surface max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Clôture &amp; récapitulatif</h2>
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--line)] p-2">
            <X className="h-4 w-4" />
          </button>
        </div>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-[color:var(--foreground)]/60">Budget alloué</dt>
            <dd className="font-semibold">{formatCurrency(event.allocatedBudget)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[color:var(--foreground)]/60">Total consommé</dt>
            <dd className="font-semibold">{formatCurrency(consumedTotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[color:var(--foreground)]/60">Dépenses</dt>
            <dd>{formatCurrency(expenseTotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[color:var(--foreground)]/60">Stock valorisé</dt>
            <dd>{formatCurrency(stockTotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[color:var(--foreground)]/60">Tâches terminées</dt>
            <dd>{taskProgressPct} %</dd>
          </div>
          <div className="flex justify-between border-t border-[var(--line)] pt-2">
            <dt className="font-medium">Écart</dt>
            <dd className={delta > 0 ? "font-semibold text-rose-700" : "font-semibold text-emerald-800"}>
              {delta > 0 ? "+" : ""}
              {formatCurrency(delta)}
            </dd>
          </div>
        </dl>
        <label className="mt-4 block text-xs font-semibold text-[color:var(--foreground)]/65">RETEX (optionnel)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="ui-focus-ring mt-1 w-full rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
          placeholder="Points forts, incidents, pistes pour la prochaine édition…"
        />
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-semibold">
            Annuler
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmit()}
            className="rounded-xl bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)]"
          >
            {submitting ? "Clôture…" : "Clôturer l'événement"}
          </button>
        </div>
      </div>
    </div>
  );
}
