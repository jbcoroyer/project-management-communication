"use client";

import { useCallback, useEffect, useState } from "react";
import { AUTO_ARCHIVE_HOURS } from "../workflowConstants";

const AUTO_ARCHIVE_KEY = "v2-auto-archive-hours";
const AUTO_ARCHIVE_EVENT = "v2-auto-archive-hours-changed";
/** Défaut = 2 jours (tâches + événementiel). */
export const DEFAULT_AUTO_ARCHIVE_HOURS = AUTO_ARCHIVE_HOURS;
const MAX_AUTO_ARCHIVE_HOURS = AUTO_ARCHIVE_HOURS;

function readAutoArchiveHours(): number {
  try {
    const raw = window.localStorage.getItem(AUTO_ARCHIVE_KEY);
    if (!raw) return DEFAULT_AUTO_ARCHIVE_HOURS;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return DEFAULT_AUTO_ARCHIVE_HOURS;
    // Ancien plafond / défaut (24 h) → nouveau délai de 2 jours.
    if (value === 24) return DEFAULT_AUTO_ARCHIVE_HOURS;
    return Math.min(value, MAX_AUTO_ARCHIVE_HOURS);
  } catch {
    return DEFAULT_AUTO_ARCHIVE_HOURS;
  }
}

/**
 * Délai d'auto-archivage (heures) pour les tâches « Terminé »
 * (tableau + événementiel). Plafonné à 48 h (2 jours).
 */
export function useAutoArchiveHours(): [number, (hours: number) => void] {
  const [hours, setHours] = useState<number>(DEFAULT_AUTO_ARCHIVE_HOURS);

  useEffect(() => {
    setHours(readAutoArchiveHours());
    const onChange = () => setHours(readAutoArchiveHours());
    window.addEventListener(AUTO_ARCHIVE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(AUTO_ARCHIVE_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const update = useCallback((next: number) => {
    const clamped = Math.min(Math.max(1, Math.round(next)), MAX_AUTO_ARCHIVE_HOURS);
    try {
      window.localStorage.setItem(AUTO_ARCHIVE_KEY, String(clamped));
      window.dispatchEvent(new Event(AUTO_ARCHIVE_EVENT));
    } catch {
      /* ignoré */
    }
    setHours(clamped);
  }, []);

  return [hours, update];
}
