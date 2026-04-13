import type { CurrentUser } from "./useCurrentUser";

export function parseAdminCsv(admin: unknown): string[] {
  if (typeof admin !== "string" || !admin.trim()) return [];
  return admin.split(",").map((s) => s.trim()).filter(Boolean);
}

function identityMatches(assignee: string, user: Pick<CurrentUser, "teamMemberName" | "displayName" | "email">): boolean {
  const n = assignee.trim();
  if (!n) return false;
  if (user.teamMemberName && n === user.teamMemberName) return true;
  if (user.displayName && n === user.displayName) return true;
  if (user.email && n === user.email) return true;
  return false;
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
