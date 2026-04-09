/**
 * Normalise le nom d'un projet : premiere lettre en majuscule, reste en minuscule.
 * Ex : "SALON NOVEMBRE 2026" -> "Salon novembre 2026"
 *      "salon novembre 2026" -> "Salon novembre 2026"
 */
export function normalizeProjectName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}
