"use client";

import { useEffect, useRef, useState } from "react";
import { TuesdayPageLoader } from "./TuesdayLoader";

export interface TuesdaySplashProps {
  /** Passe à true quand les données du premier écran sont chargées (tâches, utilisateur…). */
  ready: boolean;
  /** Durée mini d'affichage une fois montré, pour que l'animation ne soit pas coupée net. */
  minDuration?: number;
  /** Si les données arrivent avant ce délai, le splash ne s'affiche jamais. */
  delay?: number;
  label?: string;
}

type Phase = "pending" | "shown" | "leaving" | "gone";

/**
 * Écran de chargement plein écran pour le PREMIER chargement de l'app.
 * - n'apparaît pas si tout est prêt en moins de `delay` ms (pas de flash)
 * - une fois affiché, reste au moins `minDuration` ms (pas de clignotement)
 * - sort en fondu de 300 ms, puis se démonte
 * - ne revient jamais ensuite (les chargements suivants utilisent TuesdayLoader)
 */
export function TuesdaySplash({
  ready,
  minDuration = 700,
  delay = 150,
  label = "Chargement de Tuesday…",
}: TuesdaySplashProps) {
  const [phase, setPhase] = useState<Phase>("pending");
  const shownAt = useRef(0);

  // Affichage différé
  useEffect(() => {
    if (ready || phase !== "pending") return;
    const t = setTimeout(() => {
      shownAt.current = performance.now();
      setPhase("shown");
    }, delay);
    return () => clearTimeout(t);
  }, [ready, phase, delay]);

  // Sortie quand c'est prêt
  useEffect(() => {
    if (!ready) return;
    if (phase === "pending") {
      setPhase("gone");
      return;
    }
    if (phase !== "shown") return;
    const elapsed = performance.now() - shownAt.current;
    const t = setTimeout(() => setPhase("leaving"), Math.max(0, minDuration - elapsed));
    return () => clearTimeout(t);
  }, [ready, phase, minDuration]);

  // Démontage après le fondu
  useEffect(() => {
    if (phase !== "leaving") return;
    const t = setTimeout(() => setPhase("gone"), 300);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "pending" || phase === "gone") return null;
  return <TuesdayPageLoader fullscreen leaving={phase === "leaving"} label={label} />;
}
