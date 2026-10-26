export type AppVersion = "v1" | "v2" | "v3";

export const APP_VERSION_STORAGE_KEY = "idena-app-version";

/** Interface proposée par défaut après connexion. */
export const DEFAULT_APP_VERSION: AppVersion = "v3";
export const DEFAULT_HOME_PATH = "/v3/dashboard/kanban";

const VERSIONED_ROOTS = [
  "/dashboard",
  "/events",
  "/social",
  "/stock",
  "/ideas",
  "/settings",
  "/dam",
  "/deliverables",
  "/asks",
  "/todo",
  "/planning",
  "/okr",
] as const;

/** Modules retirés de la V3 : on bascule vers le tableau de bord. */
const V3_REMOVED_PREFIXES = [
  "/asks",
  "/todo",
  "/planning",
  "/okr",
  "/social",
  "/dashboard/triage",
] as const;

export function detectVersionFromPath(pathname: string): AppVersion {
  if (pathname === "/v3" || pathname.startsWith("/v3/")) return "v3";
  if (pathname === "/v2" || pathname.startsWith("/v2/")) return "v2";
  return "v1";
}

export function versionPrefix(version: AppVersion): "" | "/v2" | "/v3" {
  if (version === "v3") return "/v3";
  if (version === "v2") return "/v2";
  return "";
}

/** Préfixe de routes versionnées depuis le pathname courant (`""` | `/v2` | `/v3`). */
export function pathVersionPrefix(pathname: string): "" | "/v2" | "/v3" {
  return versionPrefix(detectVersionFromPath(pathname));
}

function stripVersionPrefix(pathname: string): string {
  if (pathname === "/v3" || pathname.startsWith("/v3/")) {
    const stripped = pathname.slice(3);
    return stripped || "/";
  }
  if (pathname === "/v2" || pathname.startsWith("/v2/")) {
    const stripped = pathname.slice(3);
    return stripped || "/";
  }
  return pathname;
}

function isVersionedAppPath(pathname: string): boolean {
  return VERSIONED_ROOTS.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`),
  );
}

function mapPathForV3(stripped: string): string {
  if (
    V3_REMOVED_PREFIXES.some(
      (prefix) => stripped === prefix || stripped.startsWith(`${prefix}/`),
    )
  ) {
    return "/dashboard/kanban";
  }
  if (stripped === "/" || stripped === "") return "/dashboard/kanban";
  if (isVersionedAppPath(stripped)) return stripped;
  return "/dashboard/kanban";
}

export function toV3Path(pathname: string): string {
  if (pathname === "/v3" || pathname.startsWith("/v3/")) return pathname;
  const stripped = stripVersionPrefix(pathname);
  return `/v3${mapPathForV3(stripped)}`;
}

export function toV2Path(pathname: string): string {
  if (pathname === "/v2" || pathname.startsWith("/v2/")) return pathname;
  const stripped = stripVersionPrefix(pathname);
  if (stripped === "/" || stripped === "") return "/v2/dashboard/kanban";
  if (isVersionedAppPath(stripped)) return `/v2${stripped}`;
  return "/v2/dashboard/kanban";
}

export function toV1Path(pathname: string): string {
  const stripped = stripVersionPrefix(pathname);
  if (!stripped || stripped === "/") return "/dashboard/kanban";
  // Chemins purement V2/V3 sans équivalent V1
  if (
    stripped === "/asks" ||
    stripped.startsWith("/asks/") ||
    stripped === "/todo" ||
    stripped.startsWith("/todo/") ||
    stripped === "/planning" ||
    stripped.startsWith("/planning/") ||
    stripped === "/okr" ||
    stripped.startsWith("/okr/") ||
    stripped === "/dam" ||
    stripped.startsWith("/dam/") ||
    stripped === "/dashboard/triage"
  ) {
    return "/dashboard/kanban";
  }
  return stripped;
}

export function toVersionPath(pathname: string, target: AppVersion): string {
  if (target === "v3") return toV3Path(pathname);
  if (target === "v2") return toV2Path(pathname);
  return toV1Path(pathname);
}

export function kanbanHref(pathname: string, taskId?: string | null): string {
  const prefix = pathVersionPrefix(pathname);
  const base = `${prefix}/dashboard/kanban`;
  return taskId ? `${base}?task=${encodeURIComponent(taskId)}` : base;
}
