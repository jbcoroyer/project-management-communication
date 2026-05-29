import type { StockIdeaCategory, StockIdeaStatus } from "./stockIdeasTypes";

export type StockIdeaDto = {
  id: string;
  createdAt: string;
  title: string;
  description: string;
  category: StockIdeaCategory;
  status: StockIdeaStatus;
};

export function ideaFromRow(row: {
  id: string;
  created_at: string;
  title: string;
  description: string | null;
  category: StockIdeaCategory;
  status: StockIdeaStatus;
}): StockIdeaDto {
  return {
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    description: row.description ?? "",
    category: row.category,
    status: row.status,
  };
}

export function ideaToClient(dto: StockIdeaDto) {
  return { ...dto };
}
