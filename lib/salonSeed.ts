import type { SalonMode } from "./salonTypes";

export type SalonSeedRow = {
  name: string;
  mode: SalonMode;
  location: string;
  startDate: string;
  endDate: string;
  hall: string;
  standNumber: string;
  surfaceM2: number | null;
  notes: string;
};

/** Salons 2026 documentés — seed manuel après build. */
export const SALON_SEED_2026: SalonSeedRow[] = [
  {
    name: "Health & Nutrition Asia 2026",
    mode: "C",
    location: "BITEC, Bangkok",
    startDate: "2026-03-10",
    endDate: "2026-03-12",
    hall: "",
    standNumber: "L025",
    surfaceM2: 12,
    notes: "Contrat L025 — mobilier facturé L027 à clarifier.",
  },
  {
    name: "VIV Select India 2026",
    mode: "C",
    location: "Yashobhoomi, New Delhi",
    startDate: "2026-04-22",
    endDate: "2026-04-24",
    hall: "01",
    standNumber: "E100",
    surfaceM2: 25,
    notes: "Factures E100 / plan E090 — à clarifier.",
  },
  {
    name: "CAHE 2026",
    mode: "B",
    location: "Chengdu",
    startDate: "2026-05-18",
    endDate: "2026-05-20",
    hall: "PF",
    standNumber: "0419-1",
    surfaceM2: 18,
    notes: "Pavillon France — plan 18 m².",
  },
  {
    name: "VIV Europe 2026",
    mode: "B",
    location: "Utrecht",
    startDate: "2026-06-02",
    endDate: "2026-06-04",
    hall: "12",
    standNumber: "B065",
    surfaceM2: 15,
    notes: "BdC 15 m² — DL visuels 17/04/2026.",
  },
  {
    name: "SPACE 2026",
    mode: "A",
    location: "Parc Expo Rennes",
    startDate: "2026-09-15",
    endDate: "2026-09-17",
    hall: "2/3",
    standNumber: "D54",
    surfaceM2: 55,
    notes: "Chevauche ILDEX Indonesia la même semaine.",
  },
  {
    name: "ILDEX Indonesia 2026",
    mode: "C",
    location: "ICE BSD, Jakarta",
    startDate: "2026-09-16",
    endDate: "2026-09-18",
    hall: "5-6",
    standNumber: "G16",
    surfaceM2: null,
    notes: "Forms deadline 14 août — conflit dates avec SPACE.",
  },
  {
    name: "Sommet de l'Élevage 2026",
    mode: "A",
    location: "Cournon-d'Auvergne",
    startDate: "2026-10-06",
    endDate: "2026-10-09",
    hall: "",
    standNumber: "",
    surfaceM2: null,
    notes: "Standiste IN FACT — détails stand à compléter.",
  },
  {
    name: "EuroTier 2026",
    mode: "A",
    location: "Hanovre",
    startDate: "2026-11-10",
    endDate: "2026-11-13",
    hall: "21",
    standNumber: "H33",
    surfaceM2: 40,
    notes: "Type A distant — hospitality / travel lourds.",
  },
];
