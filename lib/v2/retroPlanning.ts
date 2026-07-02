import type { EventRow } from "../eventTypes";

export type RetroStep = {
  offsetDays: number; // négatif = avant l'événement
  label: string;
  domain: string;
  priority: "Basse" | "Moyenne" | "Haute";
  estimatedHours: number;
};

/** Gabarit de rétroplanning « trade show » standard D-90 → D-7. */
export const DEFAULT_RETRO_TEMPLATE: RetroStep[] = [
  { offsetDays: -90, label: "Confirmer présence & réserver le stand", domain: "🎟️ Event", priority: "Haute", estimatedHours: 3 },
  { offsetDays: -75, label: "Définir objectifs, budget & message clé", domain: "🎟️ Event", priority: "Haute", estimatedHours: 4 },
  { offsetDays: -60, label: "Commander PLV, print & goodies", domain: "🖨️ Print", priority: "Haute", estimatedHours: 5 },
  { offsetDays: -45, label: "Préparer supports presse & digitaux", domain: "📰 Presse", priority: "Moyenne", estimatedHours: 4 },
  { offsetDays: -30, label: "Logistique : transport, hébergement, planning équipe", domain: "🎟️ Event", priority: "Haute", estimatedHours: 4 },
  { offsetDays: -21, label: "Campagne d'invitation & prise de RDV", domain: "🖥️ Digitale", priority: "Moyenne", estimatedHours: 3 },
  { offsetDays: -14, label: "Brief équipe & répétition pitch", domain: "🎟️ Event", priority: "Moyenne", estimatedHours: 2 },
  { offsetDays: -7, label: "Checklist finale & vérification matériel", domain: "🎟️ Event", priority: "Haute", estimatedHours: 2 },
  { offsetDays: 3, label: "Relance leads & RETEX post-salon", domain: "🎟️ Event", priority: "Haute", estimatedHours: 3 },
];

export type RetroPlanItem = RetroStep & { date: string; dayLabel: string };

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Génère le rétroplanning daté à partir de la date de début de l'événement. */
export function buildRetroPlan(event: EventRow, template: RetroStep[] = DEFAULT_RETRO_TEMPLATE): RetroPlanItem[] {
  const start = new Date(event.startDate);
  if (Number.isNaN(start.getTime())) return [];
  return template
    .map((step) => {
      const d = new Date(start);
      d.setDate(d.getDate() + step.offsetDays);
      const dayLabel = step.offsetDays < 0 ? `J${step.offsetDays}` : step.offsetDays === 0 ? "Jour J" : `J+${step.offsetDays}`;
      return { ...step, date: isoDate(d), dayLabel };
    })
    .sort((a, b) => a.offsetDays - b.offsetDays);
}
