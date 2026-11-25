/**
 * Empêche un contrôle interactif (ex. logo editable) de déclencher
 * la navigation d’un `<Link>` / parent cliquable.
 *
 * - Toujours `stopPropagation`
 * - `preventDefault` uniquement sur clic primaire (button 0 / absent)
 *   pour ne pas casser le flux `contextmenu` (bouton droit)
 */
export function isolateFromParentNav(e: {
  button?: number;
  preventDefault: () => void;
  stopPropagation: () => void;
}): void {
  e.stopPropagation();
  if (e.button == null || e.button === 0) {
    e.preventDefault();
  }
}

/**
 * Ordre d’exécution menu → file picker : onSelect puis onClose.
 * Garder le geste user synchrone pour `HTMLInputElement.click()`.
 */
export function runContextMenuSelect(opts: {
  onSelect: () => void;
  onClose: () => void;
  disabled?: boolean;
}): "ran" | "skipped" {
  if (opts.disabled) return "skipped";
  opts.onSelect();
  opts.onClose();
  return "ran";
}
