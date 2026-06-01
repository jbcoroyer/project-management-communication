import type { EventTaskCategory } from "./eventTaskCategories";

export type ChecklistTemplateTask = {
  title: string;
  category: EventTaskCategory;
  /** Jours avant la date de début du salon (ex. 30 = J-30). Valeurs négatives = après le salon. */
  daysBeforeStart: number;
  priority?: "Basse" | "Moyenne" | "Haute";
};

export type EventChecklistTemplate = {
  key: string;
  label: string;
  description: string;
  tasks: ChecklistTemplateTask[];
};

export const eventChecklistTemplates: EventChecklistTemplate[] = [
  {
    key: "salon-national",
    label: "Salon national",
    description: "Checklist complète pour un salon professionnel majeur.",
    tasks: [
      { title: "Réserver le stand / emplacement", category: "Logistique", daysBeforeStart: 90, priority: "Haute" },
      { title: "Brief équipe & planning présence", category: "RH", daysBeforeStart: 45, priority: "Haute" },
      { title: "Valider budget et enveloppes par poste", category: "Admin", daysBeforeStart: 60, priority: "Haute" },
      { title: "Commander PLV & kakémonos", category: "Stand", daysBeforeStart: 35, priority: "Haute" },
      { title: "Réserver hébergement équipe", category: "Hébergement", daysBeforeStart: 40, priority: "Moyenne" },
      { title: "Organiser transport matériel", category: "Logistique", daysBeforeStart: 14, priority: "Haute" },
      { title: "Préparer supports print & goodies", category: "Matériel", daysBeforeStart: 21, priority: "Moyenne" },
      { title: "Contenus réseaux & invitation", category: "Communication", daysBeforeStart: 30, priority: "Moyenne" },
      { title: "Landing / formulaire leads digital", category: "Digital", daysBeforeStart: 25, priority: "Moyenne" },
      { title: "Charger le stock réservé", category: "Matériel", daysBeforeStart: 7, priority: "Haute" },
      { title: "Briefing J-1 (horaires, contacts)", category: "RH", daysBeforeStart: 1, priority: "Haute" },
      { title: "Montage stand", category: "Stand", daysBeforeStart: 0, priority: "Haute" },
      { title: "Démontage & retour stock", category: "Logistique", daysBeforeStart: -2, priority: "Haute" },
      { title: "Saisie dépenses finales", category: "Admin", daysBeforeStart: -7, priority: "Moyenne" },
      { title: "RETEX & clôture événement", category: "Admin", daysBeforeStart: -14, priority: "Moyenne" },
    ],
  },
  {
    key: "salon-regional",
    label: "Salon régional",
    description: "Version allégée pour un salon local ou régional.",
    tasks: [
      { title: "Inscription & réservation stand", category: "Logistique", daysBeforeStart: 45, priority: "Haute" },
      { title: "PLV & roll-ups", category: "Stand", daysBeforeStart: 21, priority: "Moyenne" },
      { title: "Communication locale", category: "Communication", daysBeforeStart: 14, priority: "Moyenne" },
      { title: "Préparer matériel (besoins + sortie stock)", category: "Matériel", daysBeforeStart: 7, priority: "Haute" },
      { title: "Transport & logistique", category: "Logistique", daysBeforeStart: 5, priority: "Moyenne" },
      { title: "Jour J — permanence stand", category: "Stand", daysBeforeStart: 0, priority: "Haute" },
      { title: "Retour matériel & clôture budget", category: "Admin", daysBeforeStart: -5, priority: "Moyenne" },
    ],
  },
  {
    key: "webinaire",
    label: "Webinaire / visio",
    description: "Événement digital sans stand physique.",
    tasks: [
      { title: "Brief contenu & intervenants", category: "Digital", daysBeforeStart: 21, priority: "Haute" },
      { title: "Supports présentation", category: "Digital", daysBeforeStart: 10, priority: "Moyenne" },
      { title: "Tests technique (son, partage)", category: "Digital", daysBeforeStart: 3, priority: "Haute" },
      { title: "Communication inscription", category: "Communication", daysBeforeStart: 14, priority: "Moyenne" },
      { title: "Replay & compte-rendu", category: "Communication", daysBeforeStart: -3, priority: "Basse" },
    ],
  },
];

export function getEventChecklistTemplate(key: string | null | undefined): EventChecklistTemplate | null {
  if (!key) return null;
  return eventChecklistTemplates.find((t) => t.key === key) ?? null;
}

/** Date limite tâche à partir du début du salon et d'un offset J-XX. */
export function deadlineFromDaysBeforeStart(startDateIso: string, daysBeforeStart: number): string {
  const base = new Date(`${startDateIso}T12:00:00`);
  if (Number.isNaN(base.getTime())) return startDateIso;
  base.setDate(base.getDate() - daysBeforeStart);
  return base.toISOString().slice(0, 10);
}
