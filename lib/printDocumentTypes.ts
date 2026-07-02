import type { InventoryItem } from "./inventoryTypes";
import { decodePrintItemType } from "./printSpecies";

/** Types de documents Print imposés par défaut ; les types créés en base complètent la liste. */
const DEFAULT_PRINT_DOCUMENT_TYPES = ["Fiches Commerciales", "Plaquettes", "IPP"] as const;

export function printDocumentTypeOptions(items: InventoryItem[]): string[] {
  const seen = new Set<string>();
  for (const d of DEFAULT_PRINT_DOCUMENT_TYPES) seen.add(d);

  const extras: string[] = [];
  for (const i of items) {
    if (i.category !== "Print") continue;
    const t = decodePrintItemType(i.itemType ?? "").docType.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    extras.push(t);
  }
  extras.sort((a, b) => a.localeCompare(b, "fr"));
  return [...DEFAULT_PRINT_DOCUMENT_TYPES, ...extras];
}
