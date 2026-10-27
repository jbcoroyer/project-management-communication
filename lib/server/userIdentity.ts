import { createSupabaseAdmin } from "./supabaseAdmin";

export type ServerUserIdentity = {
  email: string;
  displayName: string | null;
  teamMemberName: string | null;
};

/** Identité métier de l'utilisateur (pour matcher les responsables de tâches). */
export async function getServerUserIdentity(userId: string): Promise<ServerUserIdentity> {
  const admin = createSupabaseAdmin();
  const [profileResult, authResult] = await Promise.all([
    admin
      .from("profiles")
      .select("display_name, team_members(display_name)")
      .eq("id", userId)
      .maybeSingle(),
    admin.auth.admin.getUserById(userId),
  ]);

  if (authResult.error) {
    throw new Error(authResult.error.message);
  }

  const profile = profileResult.data;
  const member = (profile?.team_members as { display_name?: string | null } | null) ?? null;

  return {
    email: authResult.data.user?.email ?? "",
    displayName: (profile?.display_name as string | null) ?? null,
    teamMemberName: member?.display_name ?? null,
  };
}
