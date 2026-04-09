const STORAGE_KEY = "event-task-groups-collapsed";

export function loadCollapsedEventGroupIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function persistCollapsedEventGroupIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* quota / private mode */
  }
}

/** Si l’id est dans l’ensemble, le groupe salon est replié (nom seul visible). */
export function toggleCollapsedEventGroup(prev: Set<string>, eventId: string): Set<string> {
  const next = new Set(prev);
  if (next.has(eventId)) next.delete(eventId);
  else next.add(eventId);
  return next;
}
