import { createSupabaseAdmin } from "./supabaseAdmin";

export type ServerUserIdentity = {
  email: string;
  displayName: string | null;
  teamMemberName: string | null;
};

/** Identité métier de l'utilisateur (pour matcher les responsables de tâches). */
export async function getServerUserIdentity(userId: string): Promise<ServerUserIdentity> {
  const admin = createSupabaseAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("display_name, team_members(display_name)")
    .eq("id", userId)
    .maybeSingle();

  const member = (profile?.team_members as { display_name?: string | null } | null) ?? null;
  const { data: authData, error } = await admin.auth.admin.getUserById(userId);
  if (error) {
    throw new Error(error.message);
  }

  return {
    email: authData.user?.email ?? "",
    displayName: (profile?.display_name as string | null) ?? null,
    teamMemberName: member?.display_name ?? null,
  };
}
