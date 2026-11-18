import type { WorkspaceModuleKey } from "./workspaceModules";

export type ServiceRole = "lead" | "member";

export type OrgService = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type ServiceMembership = {
  serviceId: string;
  role: ServiceRole;
};

/** Affinité soft des modules legacy → service (espaces métier dédiés). */
export const MODULE_SERVICE_AFFINITY: Partial<
  Record<WorkspaceModuleKey, string>
> = {
  events: "communication",
  medias: "communication",
  idees: "communication",
  stock: "communication",
  // tableau + livrables : transverses (pas d’affinité)
};

export const ACTIVE_SERVICE_STORAGE_KEY = "tuesday.activeServiceId";

/** null = « Tous mes services » ; sinon id du service actif. */
export function readStoredActiveServiceId(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(ACTIVE_SERVICE_STORAGE_KEY);
  if (!raw || raw === "all") return null;
  return raw;
}

export function writeStoredActiveServiceId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id == null) {
    window.localStorage.setItem(ACTIVE_SERVICE_STORAGE_KEY, "all");
  } else {
    window.localStorage.setItem(ACTIVE_SERVICE_STORAGE_KEY, id);
  }
}

/**
 * Soft filter : un module sans affinité reste visible.
 * Avec un service actif, on masque les modules liés à un autre slug.
 * En mode « tous », tout reste visible.
 */
export function isModuleVisibleForService(
  moduleKey: WorkspaceModuleKey | "settings" | null,
  activeServiceSlug: string | null,
): boolean {
  if (moduleKey == null || moduleKey === "settings") return true;
  if (!activeServiceSlug) return true;
  const affinity = MODULE_SERVICE_AFFINITY[moduleKey];
  if (!affinity) return true;
  return affinity === activeServiceSlug;
}
