/** Créneaux demi-heure (08:00–20:00) pour les sélecteurs de planning. */
export const HALF_HOUR_OPTIONS = Array.from({ length: 25 }, (_, i) => {
  const totalMinutes = 8 * 60 + i * 30;
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const m = String(totalMinutes % 60).padStart(2, "0");
  return `${h}:${m}`;
});

export function computeSlotHours(slot: { startTime?: string; endTime?: string; hours?: number }) {
  if (slot.startTime && slot.endTime) {
    const [sh, sm] = slot.startTime.split(":").map(Number);
    const [eh, em] = slot.endTime.split(":").map(Number);
    const diff = eh * 60 + em - (sh * 60 + sm);
    if (Number.isFinite(diff) && diff > 0) return diff / 60;
  }
  return Number(slot.hours) || 0;
}
