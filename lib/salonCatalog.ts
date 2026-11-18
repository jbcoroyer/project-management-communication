import type { SalonMode } from "./salonTypes";

/** Salon récurrent du catalogue (hors édition / année). */
export type SalonCatalogEntry = {
  slug: string;
  name: string;
  shortName: string;
  mode: SalonMode;
  defaultLocation: string;
  /** Mois typique 1–12 (indicatif pour préremplir). */
  typicalMonth: number;
  typicalDurationDays: number;
  logoSrc: string;
  website?: string;
  blurb: string;
  /** Alias pour rattacher un nom d’édition existant. */
  nameMatchers: string[];
};

/**
 * Catalogue des salons connus IDENA / Communication.
 * Logos : `public/salons/logos/` (icônes publiques des sites officiels).
 */
export const SALON_CATALOG: SalonCatalogEntry[] = [
  {
    slug: "space",
    name: "SPACE",
    shortName: "SPACE",
    mode: "A",
    defaultLocation: "Parc Expo Rennes",
    typicalMonth: 9,
    typicalDurationDays: 3,
    logoSrc: "/salons/logos/space.png",
    website: "https://www.space.fr",
    blurb: "Salon mondial de l’élevage — standiste IN FACT.",
    nameMatchers: ["space"],
  },
  {
    slug: "eurotier",
    name: "EuroTier",
    shortName: "EuroTier",
    mode: "A",
    defaultLocation: "Hanovre",
    typicalMonth: 11,
    typicalDurationDays: 4,
    logoSrc: "/salons/logos/eurotier.png",
    website: "https://www.eurotier.com",
    blurb: "Salon mondial livestock — type A distant.",
    nameMatchers: ["eurotier"],
  },
  {
    slug: "sommet-elevage",
    name: "Sommet de l'Élevage",
    shortName: "Sommet",
    mode: "A",
    defaultLocation: "Cournon-d'Auvergne",
    typicalMonth: 10,
    typicalDurationDays: 4,
    logoSrc: "/salons/logos/sommet-elevage.png",
    website: "https://www.sommet-elevage.fr",
    blurb: "Grand rendez-vous français — standiste IN FACT.",
    nameMatchers: ["sommet"],
  },
  {
    slug: "figan",
    name: "FIGAN",
    shortName: "FIGAN",
    mode: "A",
    defaultLocation: "Zaragoza",
    typicalMonth: 3,
    typicalDurationDays: 3,
    logoSrc: "/salons/logos/figan.png",
    website: "https://www.figan.es",
    blurb: "Salon livestock Espagne.",
    nameMatchers: ["figan"],
  },
  {
    slug: "viv-europe",
    name: "VIV Europe",
    shortName: "VIV Europe",
    mode: "B",
    defaultLocation: "Utrecht",
    typicalMonth: 6,
    typicalDurationDays: 3,
    logoSrc: "/salons/logos/viv-europe.png",
    website: "https://www.viveurope.nl",
    blurb: "Pavillon France / Business France.",
    nameMatchers: ["viv europe", "viv utrecht"],
  },
  {
    slug: "viv-asia",
    name: "VIV Asia",
    shortName: "VIV Asia",
    mode: "C",
    defaultLocation: "Bangkok",
    typicalMonth: 3,
    typicalDurationDays: 3,
    logoSrc: "/salons/logos/viv-asia.png",
    website: "https://www.vivasia.nl",
    blurb: "Direct organisateur VNU — Asie.",
    nameMatchers: ["viv asia"],
  },
  {
    slug: "viv-india",
    name: "VIV Select India",
    shortName: "VIV India",
    mode: "C",
    defaultLocation: "Yashobhoomi, New Delhi",
    typicalMonth: 4,
    typicalDurationDays: 3,
    logoSrc: "/salons/logos/viv-india.png",
    website: "https://www.viv.net",
    blurb: "Direct orga — Inde.",
    nameMatchers: ["viv select india", "viv india"],
  },
  {
    slug: "ildex",
    name: "ILDEX Indonesia",
    shortName: "ILDEX",
    mode: "C",
    defaultLocation: "ICE BSD, Jakarta",
    typicalMonth: 9,
    typicalDurationDays: 3,
    logoSrc: "/salons/logos/ildex.png",
    website: "https://www.vnuexhibitions.com",
    blurb: "Direct orga — Indonésie (souvent même semaine que SPACE).",
    nameMatchers: ["ildex"],
  },
  {
    slug: "cahe",
    name: "CAHE",
    shortName: "CAHE",
    mode: "B",
    defaultLocation: "Chengdu",
    typicalMonth: 5,
    typicalDurationDays: 3,
    logoSrc: "/salons/logos/cahe.png",
    website: "https://www.caheexpo.com",
    blurb: "Pavillon France — Chine.",
    nameMatchers: ["cahe"],
  },
  {
    slug: "health-nutrition",
    name: "Health & Nutrition Asia",
    shortName: "H&N Asia",
    mode: "C",
    defaultLocation: "BITEC, Bangkok",
    typicalMonth: 3,
    typicalDurationDays: 3,
    logoSrc: "/salons/logos/health-nutrition.png",
    website: "https://www.vnuexhibitions.com",
    blurb: "Direct orga — nutrition / health Asie.",
    nameMatchers: ["health", "nutrition asia", "h&n"],
  },
  {
    slug: "feed-formulation",
    name: "Feed Formulation Summit",
    shortName: "Feed Formulation",
    mode: "C",
    defaultLocation: "À préciser",
    typicalMonth: 6,
    typicalDurationDays: 2,
    logoSrc: "/salons/logos/feed-formulation.png",
    blurb: "Summit formulation — dates variables.",
    nameMatchers: ["feed formulation", "formulation"],
  },
];

export function getCatalogEntry(slug: string | null | undefined): SalonCatalogEntry | undefined {
  if (!slug) return undefined;
  return SALON_CATALOG.find((e) => e.slug === slug);
}

/** Retrouve une entrée catalogue depuis le nom d’une édition (« SPACE 2026 », etc.). */
export function matchCatalogFromName(name: string): SalonCatalogEntry | undefined {
  const n = name.trim().toLowerCase();
  if (!n) return undefined;
  const stripped = n.replace(/\b20\d{2}\b/g, "").replace(/\s+/g, " ").trim();
  for (const entry of SALON_CATALOG) {
    if (stripped === entry.name.toLowerCase() || stripped === entry.shortName.toLowerCase()) {
      return entry;
    }
    for (const m of entry.nameMatchers) {
      if (stripped.includes(m) || n.includes(m)) return entry;
    }
  }
  return undefined;
}

export function editionName(entry: SalonCatalogEntry, year: number): string {
  return `${entry.name} ${year}`;
}

/** Propose début/fin autour du mois typique (1er mardi du mois → + durée). */
export function suggestEditionDates(
  entry: SalonCatalogEntry,
  year: number,
): { startDate: string; endDate: string } {
  const monthIndex = Math.min(11, Math.max(0, entry.typicalMonth - 1));
  const d = new Date(Date.UTC(year, monthIndex, 1, 12, 0, 0));
  while (d.getUTCDay() !== 2) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  const start = d.toISOString().slice(0, 10);
  const endD = new Date(d);
  endD.setUTCDate(endD.getUTCDate() + Math.max(0, entry.typicalDurationDays - 1));
  return { startDate: start, endDate: endD.toISOString().slice(0, 10) };
}
