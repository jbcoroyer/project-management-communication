/** URL publique de l'app côté serveur (OAuth, redirections). */
export function getServerPublicAppOrigin(fallbackRequestUrl?: string): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "")}`;

  if (fallbackRequestUrl) {
    return new URL(fallbackRequestUrl).origin.replace(/\/+$/, "");
  }

  return "";
}
