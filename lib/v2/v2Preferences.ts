"use client";

import { useCallback, useEffect, useState } from "react";

const AUTO_ARCHIVE_KEY = "v2-auto-archive-hours";
const AUTO_ARCHIVE_EVENT = "v2-auto-archive-hours-changed";
export const DEFAULT_AUTO_ARCHIVE_HOURS = 24;

function readAutoArchiveHours(): number {
  try {
    const raw = window.localStorage.getItem(AUTO_ARCHIVE_KEY);
    if (!raw) return DEFAULT_AUTO_ARCHIVE_HOURS;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return DEFAULT_AUTO_ARCHIVE_HOURS;
    return Math.min(value, DEFAULT_AUTO_ARCHIVE_HOURS);
  } catch {
    return DEFAULT_AUTO_ARCHIVE_HOURS;
  }
}

/**
 * Délai d'auto-archivage V2 (heures) pour les tâches « Terminé ».
 * Plafonné à 24 h (le socle partagé archive de toute façon à 24 h).
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
    const clamped = Math.min(Math.max(1, Math.round(next)), DEFAULT_AUTO_ARCHIVE_HOURS);
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
