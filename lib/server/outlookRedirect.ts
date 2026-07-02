import { getServerPublicAppOrigin } from "./publicAppOrigin";

/** URI de redirection OAuth Outlook — doit correspondre EXACTEMENT à l'URI
 * enregistrée dans Azure (App registration → Authentication). */
export function getOutlookRedirectUri(requestUrl: string): string {
  const explicit = process.env.MS_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const origin = getServerPublicAppOrigin(requestUrl);
  return `${origin}/api/outlook/callback`;
}
