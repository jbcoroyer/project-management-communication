export const projectStatuses = ["Actif", "Terminé"] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

export type StockProject = {
  id: string;
  createdAt: string;
  name: string;
  status: ProjectStatus;
};

export type StockProjectDraft = {
  id?: string;
  name: string;
  status: ProjectStatus;
};

export type StockMovement = {
  id: string;
  createdAt: string;
  itemId: string;
  itemName: string;
  itemCategory: string | null;
  itemType: string | null;
  unitPrice: number;
  changeAmount: number;
  newQuantity: number;
  projectId: string | null;
  projectName: string | null;
  reason: string | null;
  userName: string;
};

export type RecordStockMovementPayload = {
  itemId: string;
  changeAmount: number;
  projectId?: string | null;
  /** Imputation événement (salon) — distinct du projet stock */
  eventId?: string | null;
  reason?: string | null;
  userName?: string | null;
};

export type RecordStockMovementResult = {
  movementId: string;
  itemId: string;
  itemName: string;
  previousQuantity: number;
  newQuantity: number;
  alertThreshold: number;
  unitPrice: number;
  projectId: string | null;
  projectName: string | null;
  eventId: string | null;
  eventName: string | null;
  movementCreatedAt: string;
};
