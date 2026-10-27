"use client";

import { useEffect, useState } from "react";

export function useNowInterval(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(interval);
  }, [intervalMs]);

  return now;
}

/**
 * Horloge locale pour badges deadline : ne tick que si la carte a une
 * échéance active. Évite d’invalider le memo de toutes les cartes Kanban
 * quand le parent passe un `now` global chaque minute.
 */
export function useDeadlineClock(
  deadline: string | null | undefined,
  isDone: boolean,
  intervalMs = 60_000,
) {
  const needsTick = Boolean(deadline) && !isDone;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!needsTick) return;
    const interval = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(interval);
  }, [needsTick, intervalMs]);

  return now;
}

