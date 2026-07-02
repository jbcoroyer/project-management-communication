/** URL publique de l'app côté serveur (OAuth, redirections). */
export function getServerPublicAppOrigin(fallbackRequestUrl?: string): string {
  return getStableOAuthOrigin(fallbackRequestUrl);
}

/**
 * Origine stable pour OAuth Microsoft — ne doit jamais utiliser une URL de preview
 * Vercel éphémère (ex. project-xxx-4ae9l8al0.vercel.app).
 */
export function getStableOAuthOrigin(fallbackRequestUrl?: string): string {
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost) {
    return `https://${productionHost.replace(/^https?:\/\//, "")}`;
  }

  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;

  if (fallbackRequestUrl) {
    const origin = new URL(fallbackRequestUrl).origin.replace(/\/+$/, "");
    const hostname = new URL(fallbackRequestUrl).hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") return origin;
  }

  return "";
}
