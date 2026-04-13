import type { SupabaseClient } from "@supabase/supabase-js";

/** Erreur GoTrue quand le refresh token est absent ou révoqué (cookies / stockage obsolètes). */
export function isInvalidRefreshTokenError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { message?: string; code?: string };
  const msg = (e.message ?? "").toLowerCase();
  if (
    msg.includes("invalid refresh token") ||
    msg.includes("refresh token not found")
  ) {
    return true;
  }
  return e.code === "refresh_token_not_found";
}

function shouldHardRedirectToLogin(): boolean {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname;
  return !p.startsWith("/login") && !p.startsWith("/auth/");
}

/**
 * Supprime la session locale corrompue. Redirige vers /login sur les pages protégées
 * pour éviter un tableau de bord « vide » après nettoyage.
 * @returns true si une redirection full-page a été déclenchée
 */
export async function clearInvalidSupabaseSession(
  supabase: SupabaseClient,
): Promise<boolean> {
  await supabase.auth.signOut();
  if (shouldHardRedirectToLogin()) {
    window.location.href = "/login";
    return true;
  }
  return false;
}
