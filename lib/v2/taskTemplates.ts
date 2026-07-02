import type { Priority } from "../types";

export type TaskTemplate = {
  id: string;
  name: string;
  description: string;
  domain: string;
  priority: Priority;
  /** Sous-tâches générées automatiquement à l'application du modèle. */
  subtasks: string[];
};

/**
 * Bundles réutilisables (Asana-like) : un modèle crée une tâche parente
 * pré-remplie + une structure de sous-tâches standardisée.
 */
export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: "kit-salon",
    name: "Kit salon / stand",
    description: "Préparation complète d'un salon professionnel.",
    domain: "🎟️ Event",
    priority: "Haute",
    subtasks: [
      "Réserver le stand et valider l'emplacement",
      "Concevoir les visuels (kakémonos, roll-up)",
      "Commander le print et les goodies",
      "Préparer la logistique (transport, montage)",
      "Planifier la communication avant/pendant/après",
      "Débrief & RETEX post-salon",
    ],
  },
  {
    id: "campagne-social",
    name: "Campagne réseaux sociaux",
    description: "Lancement d'une campagne multi-réseaux.",
    domain: "🖥️ Digitale",
    priority: "Moyenne",
    subtasks: [
      "Définir l'angle et le calendrier éditorial",
      "Rédiger les contenus (LinkedIn, Instagram, Facebook)",
      "Créer les visuels",
      "Programmer les publications",
      "Suivre les performances et ajuster",
    ],
  },
  {
    id: "communique-presse",
    name: "Communiqué de presse",
    description: "Rédaction et diffusion d'un communiqué.",
    domain: "📰 Presse",
    priority: "Moyenne",
    subtasks: [
      "Rédiger le communiqué",
      "Faire valider en interne",
      "Constituer la liste de diffusion presse",
      "Diffuser le communiqué",
      "Suivre les retombées médias",
    ],
  },
];

export function getTemplateById(id: string): TaskTemplate | undefined {
  return TASK_TEMPLATES.find((template) => template.id === id);
}
