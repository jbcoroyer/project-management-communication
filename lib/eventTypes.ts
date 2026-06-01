export const eventStatuses = ["Brouillon", "En préparation", "Terminé"] as const;
export type EventStatus = (typeof eventStatuses)[number];

export type BudgetPostsMap = Record<string, number>;

export type EventClosureRecap = {
  closedAt: string;
  allocatedBudget: number;
  consumedTotal: number;
  expenseTotal: number;
  stockTotal: number;
  taskProgressPct: number;
  notes?: string;
};

export type EventRow = {
  id: string;
  createdAt: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  status: EventStatus;
  allocatedBudget: number;
  budgetPosts?: BudgetPostsMap;
  templateKey?: string | null;
  closureRecap?: EventClosureRecap | null;
};

export const expenseStatuses = ["devis", "engage", "paye"] as const;
export type ExpenseStatus = (typeof expenseStatuses)[number];

export const documentTypes = ["devis", "facture", "brief", "plan", "autre"] as const;
export type EventDocumentType = (typeof documentTypes)[number];

export type ExpenseRow = {
  id: string;
  createdAt: string;
  eventId: string;
  title: string;
  amount: number;
  category: string;
  quotedAmount: number;
  committedAmount: number;
  paidAmount: number;
  expenseStatus: ExpenseStatus;
  budgetPost: string | null;
  documentPath: string | null;
};

export const expenseCategories = [
  "Logistique",
  "Hébergement",
  "Communication",
  "Stand",
  "Matériel",
  "Autre",
] as const;

export type ExpenseCategory = (typeof expenseCategories)[number];
