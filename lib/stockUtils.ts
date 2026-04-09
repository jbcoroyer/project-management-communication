import type { InventoryItem } from "./inventoryTypes";

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

/** Liste déroulante stock (ex. événements) : inclut la langue pour les documents Print. */
export function formatInventorySelectOptionLabel(item: InventoryItem): string {
  const langBit = item.category === "Print" && item.language?.trim() ? ` · ${item.language.trim()}` : "";
  return `${item.name} (${item.category}${langBit}) — ${formatNumber(item.quantity)} u. · ${formatCurrency(item.unitPrice)}`;
}

/** Libellé article dans les vues événement (mouvements) sans quantité. */
export function formatInventoryEventItemName(inv: {
  name: string | null | undefined;
  category?: string | null;
  language?: string | null;
}): string {
  const n = inv.name?.trim() || "Article";
  if (inv.category === "Print" && inv.language?.trim()) {
    return `${n} · ${inv.language.trim()}`;
  }
  return n;
}

export function inventoryItemsToCsv(items: InventoryItem[]): string {
  const headers = [
    "Categorie",
    "Type",
    "Langue",
    "Nom",
    "Quantite",
    "Prix unitaire",
    "Valeur totale",
    "Seuil alerte",
    "Dernier devis",
  ];

  const escape = (value: string | number | null | undefined) => {
    const normalized = String(value ?? "");
    return `"${normalized.replace(/"/g, '""')}"`;
  };

  const lines = items.map((item) =>
    [
      item.category,
      item.itemType,
      item.category === "Print" ? (item.language ?? "") : "",
      item.name,
      item.quantity,
      item.unitPrice,
      item.quantity * item.unitPrice,
      item.alertThreshold,
      item.lastQuoteInfo ?? "",
    ]
      .map(escape)
      .join(","),
  );

  return [headers.map(escape).join(","), ...lines].join("\n");
}
