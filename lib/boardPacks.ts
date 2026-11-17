import {
  fullBoardCapabilities,
  type BoardCapabilities,
  type BoardFieldType,
} from "./boards";

export type BoardPack = {
  id: string;
  name: string;
  description: string;
  /** Slug service cible (adv, export, rd, communication) — optionnel. */
  serviceSlug: string | null;
  capabilities: BoardCapabilities;
  fields: { label: string; key: string; fieldType: BoardFieldType }[];
};

const baseCaps = (): BoardCapabilities => ({
  ...fullBoardCapabilities(),
  media: false,
  automations: false,
});

/** Catalogue de modèles prêts à l’emploi (installables via create_board). */
export const BOARD_PACKS: BoardPack[] = [
  {
    id: "adv-devis",
    name: "Devis ADV",
    description: "Suivi commercial : montant, client, statut et relances.",
    serviceSlug: "adv",
    capabilities: {
      ...baseCaps(),
      custom_fields: true,
      files: true,
      calendar: true,
    },
    fields: [
      { label: "Client", key: "client", fieldType: "text" },
      { label: "Montant", key: "montant", fieldType: "number" },
      { label: "Statut commercial", key: "statut_commercial", fieldType: "select" },
      { label: "Prochaine relance", key: "relance", fieldType: "date" },
    ],
  },
  {
    id: "export-dossiers",
    name: "Dossiers Export",
    description: "Dossiers pays, documents et jalons logistiques.",
    serviceSlug: "export",
    capabilities: {
      ...baseCaps(),
      custom_fields: true,
      files: true,
      calendar: true,
    },
    fields: [
      { label: "Pays", key: "pays", fieldType: "text" },
      { label: "Incoterm", key: "incoterm", fieldType: "select" },
      { label: "Date d’expédition", key: "date_expedition", fieldType: "date" },
      { label: "Référence dossier", key: "ref_dossier", fieldType: "text" },
    ],
  },
  {
    id: "rd-projets",
    name: "Projets R&D",
    description: "Phases, hypothèses et livrables techniques.",
    serviceSlug: "rd",
    capabilities: {
      ...baseCaps(),
      custom_fields: true,
      files: true,
      subtasks: true,
      calendar: true,
    },
    fields: [
      { label: "Phase", key: "phase", fieldType: "select" },
      { label: "Hypothèse", key: "hypothese", fieldType: "text" },
      { label: "Jalon technique", key: "jalon", fieldType: "date" },
    ],
  },
  {
    id: "com-idees",
    name: "Boîte à idées",
    description: "Collecte et priorisation d’idées (pack Communication).",
    serviceSlug: "communication",
    capabilities: {
      ...baseCaps(),
      custom_fields: true,
      calendar: false,
      files: false,
    },
    fields: [
      { label: "Catégorie", key: "categorie", fieldType: "select" },
      { label: "Votes", key: "votes", fieldType: "number" },
    ],
  },
];

export function getBoardPack(id: string): BoardPack | undefined {
  return BOARD_PACKS.find((p) => p.id === id);
}
