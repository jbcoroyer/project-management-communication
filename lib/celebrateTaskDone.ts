import confetti from "canvas-confetti";

/** Palette festive (lisible sur fond clair). */
const COLORS = ["#3b82f6", "#f59e0b", "#22c55e", "#ea580c", "#eab308", "#d946ef", "#06b6d4"];

let lastCelebrateAt = 0;
const THROTTLE_MS = 750;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  } catch {
    return false;
  }
}

function fireTaskCelebration(): void {
  const zIndex = 400;
  const base = {
    colors: COLORS,
    zIndex,
    disableForReducedMotion: true,
  } as const;

  void confetti({
    ...base,
    particleCount: 110,
    spread: 86,
    startVelocity: 42,
    gravity: 0.95,
    scalar: 1,
    origin: { x: 0.5, y: 0.52 },
  });

  void confetti({
    ...base,
    particleCount: 45,
    angle: 60,
    spread: 58,
    origin: { x: 0, y: 0.68 },
    startVelocity: 38,
  });

  void confetti({
    ...base,
    particleCount: 45,
    angle: 120,
    spread: 58,
    origin: { x: 1, y: 0.68 },
    startVelocity: 38,
  });

  window.setTimeout(() => {
    void confetti({
      ...base,
      particleCount: 55,
      spread: 360,
      ticks: 55,
      startVelocity: 22,
      decay: 0.91,
      origin: { x: 0.5, y: 0.4 },
      shapes: ["star", "circle"],
      scalar: 0.95,
    });
  }, 200);
}

/**
 * Confettis + effet « fête » quand une tâche passe en « Terminé ».
 * Limité dans le temps pour les glisser-déposer groupés vers Terminé.
 */
export function celebrateTaskDone(): void {
  if (prefersReducedMotion()) return;
  const now = Date.now();
  if (now - lastCelebrateAt < THROTTLE_MS) return;
  lastCelebrateAt = now;
  fireTaskCelebration();
}

/**
 * Lance la même animation à la demande (bouton), sans délai anti-spam.
 */
export function celebrateTaskManually(): void {
  if (prefersReducedMotion()) return;
  lastCelebrateAt = Date.now();
  fireTaskCelebration();
}
