/** Catégories métier pour les tâches et besoins événementiels. */
export const eventTaskCategories = [
  "Logistique",
  "Stand",
  "Communication",
  "Hébergement",
  "Matériel",
  "Digital",
  "Admin",
  "RH",
] as const;

export type EventTaskCategory = (typeof eventTaskCategories)[number];

export function isEventTaskCategory(value: string): value is EventTaskCategory {
  return (eventTaskCategories as readonly string[]).includes(value);
}
