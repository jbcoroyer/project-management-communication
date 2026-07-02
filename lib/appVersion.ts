export type AppVersion = "v1" | "v2";

export const APP_VERSION_STORAGE_KEY = "idena-app-version";

const APP_ROUTE_PREFIXES = [
  "/dashboard",
  "/events",
  "/social",
  "/stock",
  "/ideas",
  "/settings",
] as const;

export function detectVersionFromPath(pathname: string): AppVersion {
  return pathname === "/v2" || pathname.startsWith("/v2/") ? "v2" : "v1";
}

export function isAppRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/v2" || pathname.startsWith("/v2/")) return true;
  return APP_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
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

export function getNavHref(href: string, version: AppVersion): string {
  if (version === "v1") return href;
  return toV2Path(href);
}
