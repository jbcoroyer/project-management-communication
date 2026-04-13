/**
 * Attribue une couleur par index à chaque collaborateur connu, sans doublon
 * tant qu'il y a au plus `paletteSize` personnes distinctes.
 * Synchroniser depuis les pages qui connaissent la liste (dashboard, paramètres, etc.).
 */

let indexByName: Record<string, number> | null = null;

function hashFallbackIndex(name: string, modulo: number): number {
  const s = name.trim();
  if (!s || modulo <= 0) return 0;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i);
  }
  return Math.abs(h) % modulo;
}

/**
 * Enregistre les couleurs à partir d’une liste **déjà ordonnée** (ex. ordre `sort_order` en base),
 * sans tri supplémentaire : index 0, 1, 2… = couleurs distinctes tant que count ≤ paletteSize.
 */
export function syncAdminColorAssignments(orderedUniqueAdminNames: string[], paletteSize: number): void {
  const names = orderedUniqueAdminNames.map((n) => n.trim()).filter(Boolean);
  const map: Record<string, number> = {};
  const n = names.length;
  const size = Math.max(1, paletteSize);

  names.forEach((name, i) => {
    map[name] = n <= size ? i : i % size;
  });

  indexByName = map;
}

export function getAdminColorIndex(name: string, paletteSize: number): number {
  const t = name.trim();
  if (!t) return 0;
  if (indexByName && Object.prototype.hasOwnProperty.call(indexByName, t)) {
    return indexByName[t]!;
  }
  return hashFallbackIndex(t, Math.max(1, paletteSize));
}
