export const BOARD_CAPABILITY_KEYS = [
  "columns",
  "custom_fields",
  "subtasks",
  "files",
  "calendar",
  "automations",
  "media",
] as const;

export type BoardCapabilityKey = (typeof BOARD_CAPABILITY_KEYS)[number];

export type BoardCapabilities = Record<BoardCapabilityKey, boolean>;

export const BOARD_CAPABILITY_META: Record<
  BoardCapabilityKey,
  { label: string; description: string }
> = {
  columns: {
    label: "Colonnes / workflow",
    description: "Suivi en colonnes (à faire, en cours, terminé…).",
  },
  custom_fields: {
    label: "Champs personnalisés",
    description: "Ajoutez des champs adaptés à votre métier.",
  },
  subtasks: {
    label: "Sous-tâches",
    description: "Découpez le travail en étapes.",
  },
  files: {
    label: "Fichiers / livrables",
    description: "Joignez des documents et rendus finaux.",
  },
  calendar: {
    label: "Calendrier / échéances",
    description: "Planifiez les dates et la charge.",
  },
  automations: {
    label: "Automatisations",
    description: "Règles « si… alors… » sur le tableau.",
  },
  media: {
    label: "Médias",
    description: "Pièces jointes images et assets.",
  },
};

export function defaultBoardCapabilities(): BoardCapabilities {
  return {
    columns: true,
    custom_fields: false,
    subtasks: true,
    files: false,
    calendar: true,
    automations: false,
    media: false,
  };
}

export function fullBoardCapabilities(): BoardCapabilities {
  return {
    columns: true,
    custom_fields: true,
    subtasks: true,
    files: true,
    calendar: true,
    automations: true,
    media: true,
  };
}

export function parseBoardCapabilities(raw: unknown): BoardCapabilities {
  const base = defaultBoardCapabilities();
  if (raw == null || typeof raw !== "object") return base;
  const obj = raw as Record<string, unknown>;
  for (const key of BOARD_CAPABILITY_KEYS) {
    if (typeof obj[key] === "boolean") base[key] = obj[key];
  }
  // Colonnes toujours actives pour un tableau de travail
  base.columns = true;
  return base;
}

export type BoardFieldType = "text" | "number" | "date" | "select";

export type BoardField = {
  id: string;
  boardId: string;
  key: string;
  label: string;
  fieldType: BoardFieldType;
  config: Record<string, unknown>;
  sortOrder: number;
};

export type OrgBoard = {
  id: string;
  organizationId: string;
  serviceId: string | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  capabilities: BoardCapabilities;
  isDefault: boolean;
  sortOrder: number;
};

export function slugifyBoardName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
