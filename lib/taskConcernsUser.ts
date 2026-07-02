import type { CurrentUser } from "./useCurrentUser";

function parseAdminCsv(admin: unknown): string[] {
  if (typeof admin !== "string" || !admin.trim()) return [];
  return admin.split(",").map((s) => s.trim()).filter(Boolean);
}

function identityMatches(assignee: string, user: Pick<CurrentUser, "teamMemberName" | "displayName" | "email">): boolean {
  const n = assignee.trim();
  if (!n) return false;
  const nLower = n.toLowerCase();
  const candidates = [user.teamMemberName, user.displayName, user.email].filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
  for (const raw of candidates) {
    const c = raw.trim();
    const cLower = c.toLowerCase();
    if (n === c || nLower === cLower) return true;
    // « Jean-Baptiste » ↔ « Jean-Baptiste Coroyer »
    if (nLower.startsWith(`${cLower} `) || cLower.startsWith(`${nLower} `)) return true;
  }
  return false;
}

/** Nom exact dans `team_members` / liste admins, pour les sélecteurs et filtres. */
export function teamAdminNameForUser(
  teamAdmins: string[],
  user: Pick<CurrentUser, "teamMemberName" | "displayName" | "email"> | null | undefined,
): string | null {
  if (!user || teamAdmins.length === 0) return null;
  for (const admin of teamAdmins) {
    if (identityMatches(admin, user)) return admin;
  }
  return null;
}

/** Assigné par défaut d'une étape : utilisateur connecté, puis responsable parent, sinon liste. */
export function resolveDefaultSubtaskAssignee(
  teamAdmins: string[],
  options?: {
    currentUser?: Pick<CurrentUser, "teamMemberName" | "displayName" | "email"> | null;
    parentTaskAdmins?: string[];
  },
): string {
  const fromCurrent = teamAdminNameForUser(teamAdmins, options?.currentUser ?? null);
  if (fromCurrent) return fromCurrent;

  const primaryParent = options?.parentTaskAdmins?.[0];
  if (primaryParent && teamAdmins.includes(primaryParent)) return primaryParent;

  // Utilisateur connecté mais profil non relié à l'équipe : pas de défaut arbitraire (évite admins[0]).
  if (options?.currentUser) return "";

  return teamAdmins[0] ?? "";
}

/** Ligne Supabase `tasks` (champs snake_case). */
export function taskRowConcernsUser(
  row: Record<string, unknown>,
  user: Pick<CurrentUser, "teamMemberName" | "displayName" | "email"> | null,
): boolean {
  if (!user) return false;
  const admins = parseAdminCsv(row.admin);
  const lane = typeof row.lane === "string" ? row.lane.trim() : "";
  if (admins.some((a) => identityMatches(a, user))) return true;
  if (lane && identityMatches(lane, user)) return true;
  return false;
}

export function deadlineDateOnly(deadline: unknown): string | null {
  if (typeof deadline !== "string" || !deadline.trim()) return null;
  const d = deadline.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

/** Jours jusqu'à la date (0 = aujourd'hui, négatif = en retard). */
export function daysFromTodayUtc(dateStr: string): number {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const day = today.getDate();
  const target = new Date(`${dateStr}T12:00:00`);
  const start = new Date(y, m, day);
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}
