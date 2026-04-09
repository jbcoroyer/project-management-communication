export const eventStatuses = ["Brouillon", "En préparation", "Terminé"] as const;
export type EventStatus = (typeof eventStatuses)[number];

export type EventRow = {
  id: string;
  createdAt: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  status: EventStatus;
  allocatedBudget: number;
};

export type ExpenseRow = {
  id: string;
  createdAt: string;
  eventId: string;
  title: string;
  amount: number;
  category: string;
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
