"use client";

import { useEffect, useMemo, useState } from "react";
import { FileCheck } from "lucide-react";
import BudgetGauge from "./BudgetGauge";
import ExpenseModal from "./ExpenseModal";
import EventClosureRecapModal from "./EventClosureRecapModal";
import { consumedByBudgetPost, parseExpenseAmounts } from "../../lib/eventBudgetUtils";
import { expenseCategories, type EventRow } from "../../lib/eventTypes";
import { saveEventBudgetPosts } from "../../app/actions/events";
import { formatCurrency } from "../../lib/stockUtils";
import { toastError, toastSuccess } from "../../lib/toast";

export type ExpenseListRow = {
  id: string;
  created_at: string;
  title: string;
  amount: number;
  category: string;
  quoted_amount?: number | string | null;
  committed_amount?: number | string | null;
  paid_amount?: number | string | null;
  expense_status?: string | null;
  budget_post?: string | null;
  document_path?: string | null;
};

type MovementCostRow = {
  id: string;
  label: string;
  cost: number;
};

type Props = {
  event: EventRow;
  expenses: ExpenseListRow[];
  stockRows: MovementCostRow[];
  consumedTotal: number;
  expenseTotal: number;
  stockTotal: number;
  taskProgressPct: number;
  onRefresh: () => void;
  onEventUpdated: () => void;
};

export default function EventBudgetSection(props: Props) {
  const {
    event,
    expenses,
    stockRows,
    consumedTotal,
    expenseTotal,
    stockTotal,
    taskProgressPct,
    onRefresh,
    onEventUpdated,
  } = props;
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [closureOpen, setClosureOpen] = useState(false);
  const [posts, setPosts] = useState<Record<string, number>>(event.budgetPosts ?? {});
  const [savingPosts, setSavingPosts] = useState(false);

  useEffect(() => {
    setPosts(event.budgetPosts ?? {});
  }, [event.budgetPosts, event.id]);

  const consumedByPost = useMemo(() => {
    const stockMap: Record<string, number> = { Matériel: stockTotal };
    return consumedByBudgetPost(expenses, stockMap);
  }, [expenses, stockTotal]);

  const savePosts = async () => {
    setSavingPosts(true);
    try {
      const r = await saveEventBudgetPosts(event.id, posts);
      if (!r.ok) {
        toastError(r.error);
        return;
      }
      toastSuccess("Enveloppes enregistrées");
      onEventUpdated();
    } finally {
      setSavingPosts(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="ui-surface rounded-[24px] p-6">
        <BudgetGauge allocated={event.allocatedBudget} consumed={consumedTotal} />
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setExpenseOpen(true)}
            className="ui-transition rounded-xl bg-[var(--foreground)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-contrast)]"
          >
            Ajouter une dépense
          </button>
          {event.status !== "Terminé" ? (
            <button
              type="button"
              onClick={() => setClosureOpen(true)}
              className="ui-transition inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-2.5 text-sm font-semibold"
            >
              <FileCheck className="h-4 w-4" />
              Clôturer l&apos;événement
            </button>
          ) : null}
        </div>
        {event.closureRecap ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Clôturé le{" "}
            {new Date(event.closureRecap.closedAt).toLocaleDateString("fr-FR")} — écart budget{" "}
            {formatCurrency(event.closureRecap.consumedTotal - event.closureRecap.allocatedBudget)}
            {event.closureRecap.notes ? (
              <p className="mt-2 text-emerald-800">{event.closureRecap.notes}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="ui-surface rounded-[24px] p-5">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Enveloppes budgétaires</h3>
        <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
          Plafond par poste (alerte visuelle si dépassement).
        </p>
        <ul className="mt-4 space-y-3">
          {expenseCategories.map((post) => {
            const cap = posts[post] ?? 0;
            const used = consumedByPost[post] ?? 0;
            const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
            const over = cap > 0 && used > cap;
            return (
              <li key={post}>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{post}</span>
                  <span className={over ? "font-semibold text-rose-700" : "text-[color:var(--foreground)]/60"}>
                    {formatCurrency(used)} / {formatCurrency(cap)}
                  </span>
                </div>
                <div className="mt-1 flex gap-2">
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={cap}
                    onChange={(e) =>
                      setPosts((prev) => ({
                        ...prev,
                        [post]: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="ui-focus-ring w-28 rounded-lg border border-[var(--line)] px-2 py-1 text-xs"
                  />
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-soft)]">
                    <div
                      className={["h-full rounded-full", over ? "bg-rose-600" : "bg-[color:var(--foreground)]/25"].join(
                        " ",
                      )}
                      style={{ width: `${cap > 0 ? pct : used > 0 ? 100 : 0}%` }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          disabled={savingPosts}
          onClick={() => void savePosts()}
          className="ui-transition mt-4 rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-semibold"
        >
          {savingPosts ? "Enregistrement…" : "Enregistrer les enveloppes"}
        </button>
      </div>

      <div className="ui-surface rounded-[24px] p-5">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Détail des coûts</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-[0.12em] text-[color:var(--foreground)]/45">
                <th className="px-3 py-2">Libellé</th>
                <th className="px-3 py-2">Devis</th>
                <th className="px-3 py-2">Engagé</th>
                <th className="px-3 py-2">Payé</th>
                <th className="px-3 py-2">Poste</th>
                <th className="px-3 py-2">Statut</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((ex) => {
                const a = parseExpenseAmounts(ex);
                return (
                  <tr key={ex.id} className="border-b border-[var(--line)]/80">
                    <td className="px-3 py-2 font-medium">{ex.title}</td>
                    <td className="px-3 py-2">{formatCurrency(a.quoted)}</td>
                    <td className="px-3 py-2">{formatCurrency(a.committed)}</td>
                    <td className="px-3 py-2">{formatCurrency(a.paid)}</td>
                    <td className="px-3 py-2">{ex.budget_post || ex.category}</td>
                    <td className="px-3 py-2 capitalize">{ex.expense_status ?? "engage"}</td>
                  </tr>
                );
              })}
              {stockRows.map((m) => (
                <tr key={m.id} className="border-b border-[var(--line)]/80">
                  <td className="px-3 py-2 font-medium">{m.label}</td>
                  <td colSpan={3} className="px-3 py-2">
                    {formatCurrency(m.cost)}
                  </td>
                  <td className="px-3 py-2">Matériel</td>
                  <td className="px-3 py-2">stock</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ExpenseModal
        open={expenseOpen}
        eventId={event.id}
        budgetPosts={posts}
        onClose={() => setExpenseOpen(false)}
        onSaved={onRefresh}
      />

      <EventClosureRecapModal
        open={closureOpen}
        event={event}
        consumedTotal={consumedTotal}
        expenseTotal={expenseTotal}
        stockTotal={stockTotal}
        taskProgressPct={taskProgressPct}
        onClose={() => setClosureOpen(false)}
        onClosed={() => {
          setClosureOpen(false);
          onEventUpdated();
          onRefresh();
        }}
      />
    </section>
  );
}
