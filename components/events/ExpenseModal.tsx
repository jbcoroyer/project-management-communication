"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { getSupabaseBrowser } from "../../lib/supabaseBrowser";
import { expenseCategories, expenseStatuses, type ExpenseStatus } from "../../lib/eventTypes";
import { toastError, toastSuccess } from "../../lib/toast";
import { getInventoryErrorMessage } from "../../lib/useInventory";

type ExpenseModalProps = {
  open: boolean;
  eventId: string;
  budgetPosts?: Record<string, number>;
  onClose: () => void;
  onSaved: () => void;
};

export default function ExpenseModal(props: ExpenseModalProps) {
  const { open, eventId, onClose, onSaved } = props;
  const [title, setTitle] = useState("");
  const [quoted, setQuoted] = useState("");
  const [committed, setCommitted] = useState("");
  const [paid, setPaid] = useState("");
  const [category, setCategory] = useState<string>(expenseCategories[0]);
  const [budgetPost, setBudgetPost] = useState<string>(expenseCategories[0]);
  const [status, setStatus] = useState<ExpenseStatus>("engage");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const parseAmount = (v: string) => Math.max(0, Number(v.replace(",", ".")) || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toastError("Indiquez un libellé.");
      return;
    }
    const q = parseAmount(quoted);
    const c = parseAmount(committed);
    const p = parseAmount(paid);
    const legacy = p > 0 ? p : c > 0 ? c : q;

    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowser();
      const { error } = await supabase.from("expenses").insert({
        event_id: eventId,
        title: title.trim(),
        amount: legacy,
        category,
        quoted_amount: q,
        committed_amount: c,
        paid_amount: p,
        expense_status: status,
        budget_post: budgetPost,
      });
      if (error) throw error;
      toastSuccess("Dépense enregistrée");
      setTitle("");
      setQuoted("");
      setCommitted("");
      setPaid("");
      setCategory(expenseCategories[0]);
      setBudgetPost(expenseCategories[0]);
      setStatus("engage");
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
      <div className="ui-surface w-full max-w-lg rounded-[28px] p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Ajouter une dépense</h2>
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--line)] p-2" aria-label="Fermer">
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
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Devis (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={quoted}
                onChange={(ev) => setQuoted(ev.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Engagé (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={committed}
                onChange={(ev) => setCommitted(ev.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Payé (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={paid}
                onChange={(ev) => setPaid(ev.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Catégorie</label>
              <select
                value={category}
                onChange={(ev) => {
                  setCategory(ev.target.value);
                  if (!budgetPost || budgetPost === category) setBudgetPost(ev.target.value);
                }}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
              >
                {expenseCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Poste budget</label>
              <select
                value={budgetPost}
                onChange={(ev) => setBudgetPost(ev.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
              >
                {expenseCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Statut</label>
              <select
                value={status}
                onChange={(ev) => setStatus(ev.target.value as ExpenseStatus)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
              >
                {expenseStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-semibold">
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-60"
            >
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
