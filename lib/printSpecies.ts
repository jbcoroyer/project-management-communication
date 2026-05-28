export const PRINT_SPECIES_OPTIONS = [
  { value: "general", label: "Général" },
  { value: "volaille", label: "Volaille" },
  { value: "ruminants", label: "Ruminants" },
  { value: "porcs", label: "Porcs" },
  { value: "multi", label: "Multi-Espèces" },
] as const;

export type PrintSpeciesValue = (typeof PRINT_SPECIES_OPTIONS)[number]["value"];

const SPECIES_PREFIX = "__species:";

export function encodePrintItemType(docType: string, species: PrintSpeciesValue): string {
  const cleanDocType = docType.trim();
  if (!cleanDocType) return "";
  if (species === "general") return cleanDocType;
  return `${SPECIES_PREFIX}${species}__::${cleanDocType}`;
}

export function decodePrintItemType(rawItemType: string): {
  docType: string;
  species: PrintSpeciesValue;
} {
  const raw = rawItemType.trim();
  const match = raw.match(/^__species:(general|volaille|ruminants|porcs|multi)__::(.+)$/i);
  if (!match) {
    return {
      docType: raw,
      species: "general",
    };
  }
  return {
    species: match[1].toLowerCase() as PrintSpeciesValue,
    docType: match[2].trim(),
  };
}
