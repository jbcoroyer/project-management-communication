export const inventoryCategories = ["Print", "Goodies", "PLV"] as const;

export type InventoryCategory = (typeof inventoryCategories)[number];

export type InventoryItem = {
  id: string;
  createdAt: string;
  category: InventoryCategory;
  itemType: string;
  /** Langue du document (Print uniquement). */
  language: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  alertThreshold: number;
  lastQuoteInfo: string | null;
  /** URL publique du visuel (principalement pour la catégorie PLV). */
  visualUrl: string | null;
};

export type InventoryItemMutation = {
  category: InventoryCategory;
  itemType: string;
  name: string;
  quantity: number;
  unitPrice: number;
  alertThreshold: number;
  /** Renseigné pour les documents Print. */
  language?: string | null;
  visualUrl?: string | null;
};

export type InventoryItemDraft = InventoryItemMutation & {
  id?: string;
};

export function isLowStock(item: InventoryItem): boolean {
  return item.quantity <= item.alertThreshold;
}

export function inventoryItemValue(item: InventoryItem): number {
  return item.quantity * item.unitPrice;
}

function toTitleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeGoodiesKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeInventoryItemType(category: InventoryCategory, rawValue: string): string {
  const trimmed = rawValue.trim();
  if (!trimmed) return "";
  if (category !== "Goodies") {
    return toTitleCase(trimmed.toLowerCase());
  }

  const key = normalizeGoodiesKey(trimmed);
  const goodiesAliases: Array<{ pattern: RegExp; canonical: string }> = [
    { pattern: /^stylo?s?$/, canonical: "Stylos" },
    { pattern: /^crayon?s?$/, canonical: "Crayons" },
    { pattern: /^mug?s?$/, canonical: "Mugs" },
    { pattern: /^gourde?s?$/, canonical: "Gourdes" },
    { pattern: /^t ?shirts?$/, canonical: "T-shirts" },
    { pattern: /^tee ?shirts?$/, canonical: "T-shirts" },
    { pattern: /^sweat?s?$/, canonical: "Sweats" },
    { pattern: /^casquette?s?$/, canonical: "Casquettes" },
    { pattern: /^tote ?bags?$/, canonical: "Tote bags" },
    { pattern: /^carnet?s?$/, canonical: "Carnets" },
    { pattern: /^badge?s?$/, canonical: "Badges" },
    { pattern: /^porte cles?$/, canonical: "Porte-cles" },
    { pattern: /^tour de coux?$/, canonical: "Tours de cou" },
    { pattern: /^lanyards?$/, canonical: "Tours de cou" },
  ];

  const matched = goodiesAliases.find((entry) => entry.pattern.test(key));
  if (matched) return matched.canonical;

  const words = key.split(" ").filter(Boolean);
  if (words.length === 1) {
    const word = words[0];
    const plural = /[sxz]$/.test(word) ? word : `${word}s`;
    return toTitleCase(plural);
  }

  return toTitleCase(key);
}
