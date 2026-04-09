export const socialPostStatuses = [
  "Idée",
  "Rédaction",
  "À valider",
  "Planifié",
  "Publié",
  "Annulé",
] as const;

export type SocialPostStatus = (typeof socialPostStatuses)[number];

export const socialNetworkOptions = [
  "LinkedIn",
  "Instagram",
  "Facebook",
  "TikTok",
  "X",
  "YouTube",
] as const;

export const socialFormatOptions = [
  "Photo",
  "Vidéo",
  "Carrousel",
  "Lien",
  "PDF",
] as const;

export const socialThematicOptions = [
  "Événement",
  "Marque",
  "Vie entreprise",
  "Produit",
  "Clients",
  "One health",
  "Presse",
] as const;

export type SocialPost = {
  id: string;
  title: string;
  scheduledAt: string;
  allDay: boolean;
  status: SocialPostStatus;
  targetNetworks: string[];
  format: string | null;
  notes: string | null;
  driveUrl: string | null;
  responsibleMemberId: string | null;
  responsibleName: string | null;
  companyId: string | null;
  companyName: string | null;
  campaignLabel: string | null;
  thematic: string | null;
  objective: string | null;
  wording: string | null;
  wordingEn: string | null;
  visualUrl: string | null;
  publicationStatus: string | null;
  timeSpentHours: number;
  reactionsCount: number | null;
  engagementRate: number | null;
  impressionsCount: number | null;
  followersCount: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type SocialMonthlyTarget = {
  companyId: string;
  year: number;
  month: number;
  targetCount: number;
};

export type SocialPostMutation = {
  title: string;
  scheduledAt: string;
  allDay: boolean;
  status: SocialPostStatus;
  targetNetworks: string[];
  format: string | null;
  notes: string | null;
  driveUrl: string | null;
  responsibleMemberId: string | null;
  companyId: string;
  campaignLabel: string | null;
  thematic: string | null;
  objective: string | null;
  wording: string | null;
  wordingEn: string | null;
  visualUrl: string | null;
  publicationStatus: string | null;
  timeSpentHours: number;
  reactionsCount: number | null;
  engagementRate: number | null;
  impressionsCount: number | null;
  followersCount: number | null;
};

export type SocialPostDraft = SocialPostMutation & {
  id?: string;
};

export function countsTowardMonthlyGauge(status: SocialPostStatus): boolean {
  return status === "Planifié" || status === "Publié";
}
