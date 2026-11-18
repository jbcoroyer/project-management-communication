import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Beaker,
  ClipboardList,
  FlaskConical,
  FolderKanban,
  Gavel,
  LayoutDashboard,
  LayoutGrid,
  ListTodo,
  Milestone,
  Scale,
  Settings2,
} from "lucide-react";
import type { WorkspaceModuleKey } from "./workspaceModules";

/** Slugs des espaces métier exposés dans le switcher top bar. */
export const METIER_SPACE_SLUGS = [
  "communication",
  "rd",
  "gestion-de-projet",
] as const;

export type MetierSpaceSlug = (typeof METIER_SPACE_SLUGS)[number];

export const METIER_SPACE_META: Record<
  MetierSpaceSlug,
  { label: string; shortLabel: string; homeHref: string; color: string }
> = {
  communication: {
    label: "Communication",
    shortLabel: "Com",
    homeHref: "/v3/dashboard/kanban",
    color: "#009cdf",
  },
  rd: {
    label: "R&D",
    shortLabel: "R&D",
    homeHref: "/v3/rd",
    color: "#7c3aed",
  },
  "gestion-de-projet": {
    label: "Gestion de Projet",
    shortLabel: "GdP",
    homeHref: "/v3/gdp",
    color: "#0f766e",
  },
};

export function isMetierSpaceSlug(value: string | null | undefined): value is MetierSpaceSlug {
  return value != null && (METIER_SPACE_SLUGS as readonly string[]).includes(value);
}

export type MetierNavItem = {
  href: string;
  label: string;
  hint: string;
  icon: LucideIcon;
};

export type MetierNavSection = {
  id: string;
  label: string;
  items: MetierNavItem[];
};

/**
 * Entrée permanente vers le Kanban org — visible dans tous les espaces métier
 * (R&D, GdP, …) pour que le switcher métier ne masque plus le tableau des tâches.
 * Communication garde sa nav boards inchangée (`metierNavForSlug` → null).
 */
export const GLOBAL_TASK_BOARD_SECTION: MetierNavSection = {
  id: "global-tasks",
  label: "Partagé",
  items: [
    {
      href: "/v3/dashboard/kanban",
      label: "Tableau des tâches",
      hint: "Kanban principal",
      icon: LayoutGrid,
    },
  ],
};

export const RD_NAV_SECTIONS: MetierNavSection[] = [
  {
    id: "pilotage",
    label: "Pilotage",
    items: [
      {
        href: "/v3/rd",
        label: "Accueil",
        hint: "Portfolio & alertes gates",
        icon: LayoutDashboard,
      },
      {
        href: "/v3/rd/projets",
        label: "Projets",
        hint: "Initiatives & maturité",
        icon: FlaskConical,
      },
      {
        href: "/v3/rd/experiences",
        label: "Expériences",
        hint: "Preuves & verdicts",
        icon: Beaker,
      },
      {
        href: "/v3/rd/gates",
        label: "Gates & revues",
        hint: "Go / no-go / pivot",
        icon: Scale,
      },
    ],
  },
  {
    id: "execution",
    label: "Exécution",
    items: [
      {
        href: "/v3/rd/travail",
        label: "Travail",
        hint: "Tâches opérationnelles",
        icon: ListTodo,
      },
      {
        href: "/v3/settings",
        label: "Réglages",
        hint: "Espace & membres",
        icon: Settings2,
      },
    ],
  },
];

export const GDP_NAV_SECTIONS: MetierNavSection[] = [
  {
    id: "pmo",
    label: "PMO",
    items: [
      {
        href: "/v3/gdp",
        label: "Portfolio",
        hint: "Santé & priorités",
        icon: LayoutDashboard,
      },
      {
        href: "/v3/gdp/projets",
        label: "Projets",
        hint: "Liste & fiches",
        icon: FolderKanban,
      },
      {
        href: "/v3/gdp/jalons",
        label: "Planification",
        hint: "Jalons transverses",
        icon: Milestone,
      },
    ],
  },
  {
    id: "gouvernance",
    label: "Gouvernance",
    items: [
      {
        href: "/v3/gdp/risques",
        label: "Risques",
        hint: "Registre scoré",
        icon: AlertTriangle,
      },
      {
        href: "/v3/gdp/decisions",
        label: "Décisions",
        hint: "Journal daté",
        icon: Gavel,
      },
      {
        href: "/v3/gdp/taches",
        label: "Tâches",
        hint: "Kanban / liste GdP",
        icon: ClipboardList,
      },
      {
        href: "/v3/settings",
        label: "Réglages",
        hint: "Espace & membres",
        icon: Settings2,
      },
    ],
  },
];

export function metierNavForSlug(slug: string | null): MetierNavSection[] | null {
  if (slug === "rd") return [GLOBAL_TASK_BOARD_SECTION, ...RD_NAV_SECTIONS];
  if (slug === "gestion-de-projet") return [GLOBAL_TASK_BOARD_SECTION, ...GDP_NAV_SECTIONS];
  return null;
}

export function isMetierRoute(pathname: string): boolean {
  return pathname.startsWith("/v3/rd") || pathname.startsWith("/v3/gdp");
}

/** Modules Communication à masquer hors espace Communication (déjà géré via affinity). */
export const COMMUNICATION_ONLY_MODULES: WorkspaceModuleKey[] = [
  "events",
  "medias",
  "idees",
  "stock",
];
