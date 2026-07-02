import { expenseCategories, type ExpenseCategory } from "./eventTypes";

export type BudgetPostsMap = Record<string, number>;

const defaultBudgetPostKeys: ExpenseCategory[] = [...expenseCategories];

/** Répartition indicative par défaut (% du budget alloué). */
const DEFAULT_SHARES: Record<ExpenseCategory, number> = {
  Stand: 0.35,
  Logistique: 0.2,
  Communication: 0.15,
  Hébergement: 0.12,
  Matériel: 0.13,
  Autre: 0.05,
};

export function buildDefaultBudgetPosts(allocatedBudget: number): BudgetPostsMap {
  const posts: BudgetPostsMap = {};
  for (const key of defaultBudgetPostKeys) {
    posts[key] = Math.round(allocatedBudget * (DEFAULT_SHARES[key] ?? 0.1) * 100) / 100;
  }
  return posts;
}

export type ExpenseAmounts = {
  quoted: number;
  committed: number;
  paid: number;
  /** Montant « réel » affiché (priorité payé > engagé > devis > amount legacy) */
  effective: number;
};

export function parseExpenseAmounts(row: {
  amount?: number | string | null;
  quoted_amount?: number | string | null;
  committed_amount?: number | string | null;
  paid_amount?: number | string | null;
}): ExpenseAmounts {
  const legacy = Math.max(0, Number(row.amount ?? 0) || 0);
  const quoted = Math.max(0, Number(row.quoted_amount ?? 0) || 0);
  const committed = Math.max(0, Number(row.committed_amount ?? 0) || 0);
  const paid = Math.max(0, Number(row.paid_amount ?? 0) || 0);
  const effective = paid > 0 ? paid : committed > 0 ? committed : quoted > 0 ? quoted : legacy;
  return { quoted, committed, paid, effective };
}

export function consumedByBudgetPost(
  expenses: Array<{
    category: string;
    budget_post?: string | null;
    amount?: number | string | null;
    quoted_amount?: number | string | null;
    committed_amount?: number | string | null;
    paid_amount?: number | string | null;
  }>,
  stockByPost: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const ex of expenses) {
    const post = ex.budget_post?.trim() || ex.category || "Autre";
    const amounts = parseExpenseAmounts(ex);
    out[post] = (out[post] ?? 0) + amounts.effective;
  }
  for (const [post, val] of Object.entries(stockByPost)) {
    out[post] = (out[post] ?? 0) + val;
  }
  return out;
}
