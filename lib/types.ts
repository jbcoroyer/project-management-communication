// Types et constantes partagés pour le projet Kanban

export const defaultColumns = ["À faire", "En cours", "En validation", "Terminé"];
/** Plus de noms « fantômes » : les assignés viennent uniquement de `team_members` (Paramètres). */
export const defaultAdmins: readonly string[] = [];
export const defaultCompanies = [
  "IDENA",
  "IDENA Nutricion",
  "IDENA Production",
  "IDENA Romania",
  "INDY FEED",
  "SECOPALM",
  "STI biotechnologie",
  "VERTAL",
];
export const defaultDomains = [
  "🖥️ Digitale",
  "📮 Client",
  "🎟️ Event",
  "🌎 General",
  "🖨️ Print",
  "📰 Presse",
];
export const priorities = ["Basse", "Moyenne", "Haute"] as const;

// Alias de compatibilité: le code existant importe encore ces noms.
export const columns = defaultColumns;
export const admins = defaultAdmins;
export const companies = defaultCompanies;
export const domains = defaultDomains;

export type ColumnId = string;
export type AdminId = string;
export type Company = string;
export type Domain = string;
export type Priority = (typeof priorities)[number];

/** Un jour planifié avec un créneau horaire (pour projected_work) */
export type ProjectedWorkItem = {
  date: string;
  hours: number;
  startTime?: string;
  endTime?: string;
};

export type Task = {
  id: string;
  createdAt?: string;
  projectName: string;
  company: Company;
  domain: Domain;
  admins: AdminId[];
  isClientRequest: boolean;
  clientName: string;
  requestDate: string;
  deadline: string;
  budget: string;
  description: string;
  column: ColumnId;
  priority: Priority;
  projectedWork: ProjectedWorkItem[];
  elapsedMs: number;
  isRunning: boolean;
  lastStartTime?: number;
  isArchived: boolean;
  estimatedHours: number;
  estimatedDays: number;
  /** Horodatage ISO du passage en colonne « Terminé » (archivage auto 24h après). */
  completedAt?: string;
  /** ID de la tache parente (null = tache racine) */
  parentTaskId?: string;
  /** Lien optionnel vers un événement (salon) — imbrication charge de travail globale */
  eventId?: string;
  /** Catégorie métier événement (Logistique, Com, etc.) */
  eventCategory?: string | null;
  /** Nom du salon (jointure `events`) — regroupement Kanban */
  eventName?: string | null;
  /** Sous-taches regroupees cote client (non persistees ici) */
  subtasks?: Task[];
};

export type NewTaskFormState = {
  projectName: string;
  company: Company;
  domain: Domain;
  admins: AdminId[];
  isClientRequest: boolean;
  clientName: string;
  deadline: string;
  budget: string;
  description: string;
  priority: Priority;
  projectedWork: ProjectedWorkItem[];
  estimatedHours: string;
  estimatedDays: string;
};

export const initialFormState: NewTaskFormState = {
  projectName: "",
  company: defaultCompanies[0],
  domain: defaultDomains[0],
  admins: [],
  isClientRequest: false,
  clientName: "",
  deadline: "",
  budget: "",
  description: "",
  priority: "Moyenne",
  projectedWork: [],
  estimatedHours: "",
  estimatedDays: "",
};

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    seconds.toString().padStart(2, "0"),
  ].join(":");
}
