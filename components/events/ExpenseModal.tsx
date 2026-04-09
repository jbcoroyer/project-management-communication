"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { getSupabaseBrowser } from "../../lib/supabaseBrowser";
import { expenseCategories } from "../../lib/eventTypes";
import { toastError, toastSuccess } from "../../lib/toast";
import { getInventoryErrorMessage } from "../../lib/useInventory";

type ExpenseModalProps = {
  open: boolean;
  eventId: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function ExpenseModal(props: ExpenseModalProps) {
  const { open, eventId, onClose, onSaved } = props;
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>(expenseCategories[0]);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toastError("Indiquez un libellé.");
      return;
    }
    const n = Number(amount.replace(",", ".")) || 0;
    if (n < 0) {
      toastError("Le montant doit être positif.");
      return;
    }
    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.from("expenses").insert({
        event_id: eventId,
        title: title.trim(),
        amount: n,
        category,
      });
      if (error) throw error;
      toastSuccess("Dépense enregistrée");
      setTitle("");
      setAmount("");
      setCategory(expenseCategories[0]);
      onSaved();
      onClose();
    } catch (err) {
      toastError(getInventoryErrorMessage(err, "Impossible d'enregistrer la dépense."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(ev) => ev.target === ev.currentTarget && onClose()}
    >
      <div className="ui-surface w-full max-w-md rounded-[28px] p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Ajouter une dépense</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--line)] p-2 text-[color:var(--foreground)]/60"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Libellé</label>
            <input
              value={title}
              onChange={(ev) => setTitle(ev.target.value)}
              className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              placeholder="Ex. Hôtel équipe"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Montant (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(ev) => setAmount(ev.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Catégorie</label>
              <select
                value={category}
                onChange={(ev) => setCategory(ev.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              >
                {expenseCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#fffdf9] disabled:opacity-60"
            >
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
