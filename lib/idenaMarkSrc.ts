/**
 * Fallback statique (hors base) : `.env` ou fichier par défaut dans `public/`.
 * La résolution finale utilise `useIdenaMark()` (priorité à Supabase).
 */
export function getIdenaMarkStaticSrc(): string {
  const v = process.env.NEXT_PUBLIC_IDENA_MARK_SRC?.trim();
  if (v) return v;
  return "/idena-picto.png";
}

export function isExternalImageSrc(src: string): boolean {
  return /^https?:\/\//i.test(src);
}
