/**
 * Services / boards hors cœur Communication + Salons.
 * Filtre UI immédiat (même si la migration DB n’est pas encore appliquée).
 */

export const STRIPPED_SERVICE_SLUGS = [
  "adv",
  "export",
  "rd",
  "gestion-de-projet",
] as const;

export type StrippedServiceSlug = (typeof STRIPPED_SERVICE_SLUGS)[number];

/** Slugs boards seed (packs + espaces métier). Inclut le slug tronqué « evis » observé en prod pour Devis ADV. */
export const STRIPPED_BOARD_SLUGS = [
  "travail-rd",
  "taches-gdp",
  "devis-adv",
  "evis",
  "dossiers-export",
  "projets-rd",
  "rd-projets",
  "export-dossiers",
  "adv-devis",
] as const;

/** Noms exacts des boards seed à masquer. */
export const STRIPPED_BOARD_NAMES = [
  "Devis ADV",
  "Dossiers Export",
  "Projets R&D",
  "Travail R&D",
  "Tâches projet",
] as const;

const strippedServiceSet = new Set<string>(STRIPPED_SERVICE_SLUGS);
const strippedSlugSet = new Set<string>(STRIPPED_BOARD_SLUGS);
const strippedNameSet = new Set<string>(STRIPPED_BOARD_NAMES);

export function isStrippedServiceSlug(slug: string | null | undefined): boolean {
  return slug != null && strippedServiceSet.has(slug);
}

export function isStrippedBoard(input: {
  slug?: string | null;
  name?: string | null;
  serviceSlug?: string | null;
}): boolean {
  if (input.serviceSlug && strippedServiceSet.has(input.serviceSlug)) return true;
  if (input.slug && strippedSlugSet.has(input.slug)) return true;
  if (input.name && strippedNameSet.has(input.name.trim())) return true;
  return false;
}
