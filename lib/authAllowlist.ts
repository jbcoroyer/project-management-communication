/**
 * Restriction d'inscription : domaines e-mail autorisés.
 * Configurez NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS=idena.fr,autre.fr
 * NEXT_PUBLIC_DISABLE_SIGNUP=1 pour masquer complètement l'inscription.
 */

const DEFAULT_DOMAINS = ["idena.fr"];

export function isSignupDisabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_DISABLE_SIGNUP?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function allowedEmailDomains(): string[] {
  const raw = process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS?.trim();
  if (raw === "") return [];
  if (!raw) return DEFAULT_DOMAINS;
  return raw
    .split(",")
    .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
}

export function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 0) return "";
  return email.slice(at + 1).trim().toLowerCase();
}

/** Retourne null si OK, sinon un message d'erreur FR. */
export function validateSignupEmail(email: string): string | null {
  if (isSignupDisabled()) {
    return "Les inscriptions sont désactivées. Demandez un accès à un administrateur.";
  }
  const domains = allowedEmailDomains();
  if (domains.length === 0) return null;
  const domain = emailDomain(email);
  if (!domain || !domains.includes(domain)) {
    return `Inscription réservée aux adresses @${domains.join(", @")}.`;
  }
  return null;
}
