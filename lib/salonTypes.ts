export const salonModes = ["A", "B", "C"] as const;
export type SalonMode = (typeof salonModes)[number];

export const salonStatuses = ["preparation", "en_cours", "termine"] as const;
export type SalonStatus = (typeof salonStatuses)[number];

export const salonDocCategories = [
  "orga",
  "business_france",
  "standiste",
  "kit_local",
  "visuels",
  "badges",
  "travel",
  "portails",
  "autre",
] as const;
export type SalonDocCategory = (typeof salonDocCategories)[number];

export const salonDocKinds = ["autre", "devis", "facture"] as const;
export type SalonDocKind = (typeof salonDocKinds)[number];

export type Salon = {
  id: string;
  organizationId: string;
  name: string;
  mode: SalonMode;
  status: SalonStatus;
  location: string;
  startDate: string;
  endDate: string;
  hall: string;
  standNumber: string;
  surfaceM2: number | null;
  notes: string;
  /** Slug catalogue (SPACE, EuroTier…) — logos & création guidée. */
  catalogSlug: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SalonChecklistItem = {
  id: string;
  organizationId: string;
  salonId: string;
  label: string;
  dueDate: string | null;
  done: boolean;
  sortOrder: number;
  documentId: string | null;
  /** Tâche miroir sur le tableau / agenda (même échéance). */
  taskId: string | null;
};

export type SalonDocument = {
  id: string;
  organizationId: string;
  salonId: string;
  category: SalonDocCategory;
  docKind: SalonDocKind;
  title: string;
  description: string;
  url: string;
  storagePath: string | null;
  fileName: string | null;
  fileMime: string | null;
  fileSizeBytes: number | null;
  amountHt: number | null;
  amountTtc: number | null;
  dueDate: string | null;
};

export type SalonContact = {
  id: string;
  organizationId: string;
  salonId: string;
  label: string;
  value: string;
  sortOrder: number;
};

export type SalonBudgetLine = {
  id: string;
  organizationId: string;
  salonId: string;
  label: string;
  category: string;
  amountHt: number;
  amountTtc: number;
  dueDate: string | null;
  paid: boolean;
  documentId: string | null;
};

export const SALON_MODE_LABELS: Record<SalonMode, string> = {
  A: "Standiste",
  B: "Pavillon France",
  C: "Direct orga",
};

export const SALON_STATUS_LABELS: Record<SalonStatus, string> = {
  preparation: "Préparation",
  en_cours: "En cours",
  termine: "Terminé",
};

export const SALON_DOC_CATEGORY_LABELS: Record<SalonDocCategory, string> = {
  orga: "Orga",
  business_france: "Business France",
  standiste: "Standiste",
  kit_local: "Kit local",
  visuels: "Visuels",
  badges: "Badges",
  travel: "Travel",
  portails: "Portails",
  autre: "Autre",
};

export const SALON_DOC_KIND_LABELS: Record<SalonDocKind, string> = {
  autre: "Document",
  devis: "Devis",
  facture: "Facture",
};

export function docCategoriesForMode(mode: SalonMode): SalonDocCategory[] {
  if (mode === "A") {
    return ["orga", "standiste", "visuels", "badges", "travel", "portails", "autre"];
  }
  if (mode === "B") {
    return ["orga", "business_france", "kit_local", "visuels", "badges", "travel", "portails", "autre"];
  }
  return ["orga", "kit_local", "visuels", "badges", "travel", "portails", "autre"];
}
