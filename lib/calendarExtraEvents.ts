/** Événements calendrier ajoutés manuellement (hors tâches projet), persistés en local. */

export type CalendarExtraEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  salon?: string;
  notes?: string;
};

const STORAGE_KEY = "service-com-calendar-extra-events-v1";

export function loadCalendarExtraEvents(): CalendarExtraEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is CalendarExtraEvent =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as CalendarExtraEvent).id === "string" &&
        typeof (e as CalendarExtraEvent).title === "string" &&
        typeof (e as CalendarExtraEvent).start === "string" &&
        typeof (e as CalendarExtraEvent).end === "string",
    );
  } catch {
    return [];
  }
}

export function saveCalendarExtraEvents(events: CalendarExtraEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    /* quota ou navigation privée */
  }
}
