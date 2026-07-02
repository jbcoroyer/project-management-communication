/**
 * Helper Microsoft Graph — serveur uniquement.
 * Gère le flux OAuth2 (authorization code + refresh) et le CRUD des événements
 * d'agenda Outlook 365 via Microsoft Graph.
 *
 * Documentation : https://learn.microsoft.com/graph/api/resources/event
 */

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

/** Fuseau horaire Windows utilisé pour les événements (Paris/France par défaut). */
export const MS_TIMEZONE = process.env.MS_TIMEZONE?.trim() || "Romance Standard Time";

/**
 * Portées demandées. `offline_access` est indispensable pour obtenir un
 * refresh_token et garder la synchro active sans reconnexion.
 */
const MS_SCOPES = "openid profile email offline_access User.Read Calendars.ReadWrite";

function tenant(): string {
  return process.env.MS_TENANT_ID?.trim() || "common";
}

function authorityBase(): string {
  return `https://login.microsoftonline.com/${tenant()}/oauth2/v2.0`;
}

function getMsClientConfig(): { clientId: string; clientSecret: string } {
  const clientId = process.env.MS_CLIENT_ID?.trim();
  const clientSecret = process.env.MS_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      "Configuration Microsoft manquante : définissez MS_CLIENT_ID et MS_CLIENT_SECRET (localement dans .env.local, sur Vercel dans Paramètres → Variables d'environnement).",
    );
  }
  return { clientId, clientSecret };
}

export function isMicrosoftConfigured(): boolean {
  return Boolean(process.env.MS_CLIENT_ID?.trim() && process.env.MS_CLIENT_SECRET?.trim());
}

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
};

/** Construit l'URL d'autorisation Microsoft (étape 1 du flux OAuth). */
export function buildAuthorizeUrl(redirectUri: string, state: string): string {
  const { clientId } = getMsClientConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: MS_SCOPES,
    state,
    prompt: "select_account",
  });
  return `${authorityBase()}/authorize?${params.toString()}`;
}

async function requestToken(body: Record<string, string>): Promise<TokenResponse> {
  const { clientId, clientSecret } = getMsClientConfig();
  const res = await fetch(`${authorityBase()}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      ...body,
    }).toString(),
  });
  const json = (await res.json()) as TokenResponse & {
    error?: string;
    error_description?: string;
  };
  if (!res.ok || json.error) {
    throw new Error(
      `Microsoft OAuth: ${json.error ?? res.status} — ${json.error_description ?? "échec d'échange du jeton."}`,
    );
  }
  return json;
}

/** Échange le code d'autorisation contre des jetons (étape 2 du flux OAuth). */
export function exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenResponse> {
  return requestToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    scope: MS_SCOPES,
  });
}

/** Rafraîchit l'access_token à partir du refresh_token. */
export function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  return requestToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: MS_SCOPES,
  });
}

export type GraphUser = { id: string; mail?: string | null; userPrincipalName?: string | null };

/** Récupère le profil Microsoft connecté (email + id). */
export async function fetchGraphUser(accessToken: string): Promise<GraphUser> {
  const res = await graphFetch(accessToken, "/me?$select=id,mail,userPrincipalName");
  return (await res.json()) as GraphUser;
}

/** Requête générique vers Microsoft Graph (lève une erreur si statut ≥ 400). */
async function graphFetch(
  accessToken: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: `outlook.timezone="${MS_TIMEZONE}"`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "");
    throw new Error(`Microsoft Graph ${res.status} sur ${path} : ${text}`);
  }
  return res;
}

export type GraphEventPayload = {
  subject: string;
  body?: { contentType: "HTML" | "Text"; content: string };
  start: { dateTime: string; timeZone: string } | { date: string };
  end: { dateTime: string; timeZone: string } | { date: string };
  isAllDay?: boolean;
  categories?: string[];
};

/** Crée un événement dans l'agenda principal — renvoie l'id Graph. */
export async function createEvent(
  accessToken: string,
  payload: GraphEventPayload,
): Promise<string> {
  const res = await graphFetch(accessToken, "/me/events", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as { id: string };
  return json.id;
}

/** Met à jour un événement existant. Renvoie false si l'événement n'existe plus (404). */
export async function updateEvent(
  accessToken: string,
  eventId: string,
  payload: GraphEventPayload,
): Promise<boolean> {
  const res = await graphFetch(accessToken, `/me/events/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return res.status !== 404;
}

/** Supprime un événement. Ne lève pas d'erreur si déjà supprimé (404). */
export async function deleteEvent(accessToken: string, eventId: string): Promise<void> {
  await graphFetch(accessToken, `/me/events/${eventId}`, { method: "DELETE" });
}
