import type { SalonMode } from "./salonTypes";

export type SalonChecklistTemplateItem = {
  label: string;
  /** Jours avant la date de début du salon (négatif = après). */
  daysBeforeStart: number;
};

export type SalonContactTemplate = {
  label: string;
  value: string;
};

const CHECKLIST_A: SalonChecklistTemplateItem[] = [
  { label: "Inscription / contrat organisateur signé", daysBeforeStart: 180 },
  { label: "Paiements / acomptes orga à jour", daysBeforeStart: 120 },
  { label: "Disposition + devis standiste validé", daysBeforeStart: 90 },
  { label: "Plans / implantation OK", daysBeforeStart: 60 },
  { label: "Visuels validés & envoyés (BAT)", daysBeforeStart: 45 },
  { label: "Services orga commandés", daysBeforeStart: 40 },
  { label: "Hospitalité / courses calées", daysBeforeStart: 21 },
  { label: "Badges équipe", daysBeforeStart: 14 },
  { label: "Invitations / signature mail", daysBeforeStart: 14 },
  { label: "Travel / hébergement OK", daysBeforeStart: 21 },
  { label: "Remise stand / présence veille", daysBeforeStart: 1 },
  { label: "RETEX + docs rangés", daysBeforeStart: -14 },
];

const CHECKLIST_B: SalonChecklistTemplateItem[] = [
  { label: "BdC Business France / demande participation signée", daysBeforeStart: 180 },
  { label: "Paiements BF / acomptes à jour", daysBeforeStart: 90 },
  { label: "Kit pavillon confirmé (surface / angle)", daysBeforeStart: 60 },
  { label: "Visuels formats CIT/Guide envoyés", daysBeforeStart: 45 },
  { label: "Options (mobilier, graphiques…)", daysBeforeStart: 30 },
  { label: "Badges équipe", daysBeforeStart: 14 },
  { label: "Catalogue / infos BF transmises", daysBeforeStart: 30 },
  { label: "Travel + présence veille obligatoire", daysBeforeStart: 7 },
  { label: "Liens portail / contacts à jour", daysBeforeStart: 21 },
  { label: "RETEX + docs rangés", daysBeforeStart: -14 },
];

const CHECKLIST_C: SalonChecklistTemplateItem[] = [
  { label: "Contrat organisateur / shell signé", daysBeforeStart: 180 },
  { label: "Payment plan / acomptes à jour", daysBeforeStart: 90 },
  { label: "Package stand (shell / premium) calé", daysBeforeStart: 60 },
  { label: "Artwork / visuels envoyés (portail)", daysBeforeStart: 35 },
  { label: "Options locales (mobilier, print…)", daysBeforeStart: 28 },
  { label: "Badges / registration exposant", daysBeforeStart: 14 },
  { label: "Portail exposant — forms complétés", daysBeforeStart: 21 },
  { label: "Travel si distant", daysBeforeStart: 21 },
  { label: "RETEX + docs rangés", daysBeforeStart: -14 },
];

const CONTACTS_A: SalonContactTemplate[] = [
  { label: "Standiste IN FACT", value: "mveschambre@agence-infact.com" },
  { label: "Portail / orga salon", value: "" },
];

const CONTACTS_B: SalonContactTemplate[] = [
  { label: "Business France (Anne-Marie Brault)", value: "anne-marie.brault@businessfrance.fr" },
  { label: "EventOrga", value: "salon@eventorga.es" },
  { label: "Portail exposant", value: "" },
];

const CONTACTS_C: SalonContactTemplate[] = [
  { label: "VNU / organisateur", value: "customerservice@vnuexhibitions.com" },
  { label: "Portail exposant", value: "" },
];

export function checklistTemplateForMode(mode: SalonMode): SalonChecklistTemplateItem[] {
  if (mode === "A") return CHECKLIST_A;
  if (mode === "B") return CHECKLIST_B;
  return CHECKLIST_C;
}

export function contactsTemplateForMode(mode: SalonMode): SalonContactTemplate[] {
  if (mode === "A") return CONTACTS_A;
  if (mode === "B") return CONTACTS_B;
  return CONTACTS_C;
}

export function dateFromDaysBeforeStart(startDateIso: string, daysBeforeStart: number): string {
  const d = new Date(`${startDateIso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return startDateIso;
  d.setDate(d.getDate() - daysBeforeStart);
  return d.toISOString().slice(0, 10);
}
