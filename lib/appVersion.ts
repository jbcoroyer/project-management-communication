export type AppVersion = "v1" | "v2";

export const APP_VERSION_STORAGE_KEY = "idena-app-version";

export function detectVersionFromPath(pathname: string): AppVersion {
  return pathname === "/v2" || pathname.startsWith("/v2/") ? "v2" : "v1";
}

export function toV2Path(pathname: string): string {
  if (pathname === "/v2" || pathname.startsWith("/v2/")) return pathname;
  if (pathname === "/") return "/v2/dashboard/kanban";
  if (
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/events" ||
    pathname.startsWith("/events/") ||
    pathname === "/social" ||
    pathname.startsWith("/social/") ||
    pathname === "/stock" ||
    pathname.startsWith("/stock/") ||
    pathname === "/ideas" ||
    pathname.startsWith("/ideas/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/")
  ) {
    return `/v2${pathname}`;
  }
  return "/v2/dashboard/kanban";
}

export function toV1Path(pathname: string): string {
  if (!pathname.startsWith("/v2")) return pathname;
  const stripped = pathname.slice(3);
  if (!stripped || stripped === "/") return "/dashboard/kanban";
  return stripped;
}
