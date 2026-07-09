/**
 * Pictogramme IDENA par défaut : composant SVG (`IdenaLogo`).
 * `NEXT_PUBLIC_IDENA_MARK_SRC` ou Supabase peuvent encore surcharger par une URL externe.
 */
export function getIdenaMarkCustomSrc(): string | null {
  const v = process.env.NEXT_PUBLIC_IDENA_MARK_SRC?.trim();
  return v || null;
}

export function isExternalImageSrc(src: string): boolean {
  return /^https?:\/\//i.test(src);
}
