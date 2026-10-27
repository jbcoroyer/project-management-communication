/** Identifiant fixe de l’espace Service Communication — ne pas modifier ses modules. */
export const SERVICE_COMMUNICATION_ORG_ID =
  "00000000-0000-0000-0000-000000000001";

export const WORKSPACE_MODULE_KEYS = [
  "tableau",
  "livrables",
  "events",
  "medias",
  "idees",
  "stock",
] as const;

export type WorkspaceModuleKey = (typeof WORKSPACE_MODULE_KEYS)[number];

export type WorkspaceModules = Record<WorkspaceModuleKey, boolean>;

export const WORKSPACE_MODULE_META: Record<
  WorkspaceModuleKey,
  { label: string; description: string; href: string }
> = {
  tableau: {
    label: "Tableau",
    description:
      "Kanban et liste de tâches : suivez le travail en colonnes (à faire, en cours, terminé).",
    href: "/v3/dashboard/kanban",
  },
  livrables: {
    label: "Livrables",
    description:
      "Déposez et retrouvez les fichiers finaux liés à vos projets (PDF, visuels, etc.).",
    href: "/v3/deliverables",
  },
  events: {
    label: "Événements",
    description:
      "Préparez salons et événements : planning, budget, besoins matériels et retex.",
    href: "/v3/events/dashboard",
  },
  medias: {
    label: "Médias",
    description:
      "Bibliothèque de médias partagés (images, logos, assets) pour votre équipe.",
    href: "/v3/dam",
  },
  idees: {
    label: "Idées",
    description: "Boîte à idées pour collecter et voter des propositions.",
    href: "/v3/ideas",
  },
  stock: {
    label: "Stock",
    description:
      "Inventaire PLV / goodies : quantités, mouvements et alertes de réassort.",
    href: "/v3/stock",
  },
};

export function allModulesEnabled(): WorkspaceModules {
  return {
    tableau: true,
    livrables: true,
    events: true,
    medias: true,
    idees: true,
    stock: true,
  };
}

export function parseWorkspaceModules(
  raw: unknown,
  opts?: { treatNullAsAll?: boolean },
): WorkspaceModules | null {
  if (raw == null) {
    return opts?.treatNullAsAll === false ? null : allModulesEnabled();
  }
  if (typeof raw !== "object") return allModulesEnabled();
  const obj = raw as Record<string, unknown>;
  const next = allModulesEnabled();
  for (const key of WORKSPACE_MODULE_KEYS) {
    next[key] = obj[key] === true;
  }
  return next;
}

export function moduleKeyForHref(href: string): WorkspaceModuleKey | "settings" | null {
  if (href.startsWith("/v3/settings")) return "settings";
  if (href.startsWith("/v3/dashboard") || href === "/v3") return "tableau";
  if (href.startsWith("/v3/deliverables")) return "livrables";
  if (href.startsWith("/v3/events")) return "events";
  if (href.startsWith("/v3/dam")) return "medias";
  if (href.startsWith("/v3/ideas")) return "idees";
  if (href.startsWith("/v3/stock")) return "stock";
  return null;
}
