/** URI de redirection OAuth Outlook — doit correspondre EXACTEMENT à l'URI
 * enregistrée dans Azure (App registration → Authentication). */
export function getOutlookRedirectUri(requestUrl: string): string {
  const explicit = process.env.MS_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  const origin = appUrl || new URL(requestUrl).origin;
  return `${origin}/api/outlook/callback`;
}
