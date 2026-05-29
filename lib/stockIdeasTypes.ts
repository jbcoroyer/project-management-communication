export type StockIdeaCategory = "materiel" | "process" | "communication" | "autre";
export type StockIdeaStatus = "nouveau" | "etude" | "adopte" | "archive";

export type StockIdea = {
  id: string;
  createdAt: string;
  title: string;
  description: string;
  category: StockIdeaCategory;
  status: StockIdeaStatus;
};
