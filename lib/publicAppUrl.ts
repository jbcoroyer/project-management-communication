/**
 * URL publique de l’app (OAuth / recovery email redirectTo).
 * Sur Vercel, next.config.ts remplit NEXT_PUBLIC_APP_URL depuis VERCEL_URL si besoin.
 */
export function getPublicAppOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") {
    return window.location.origin.replace(/\/+$/, "");
  }
  return "";
}
