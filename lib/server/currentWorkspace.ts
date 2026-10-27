import type { SupabaseClient } from "@supabase/supabase-js";

/** Espace actif de l'utilisateur (profiles.organization_id), via session. */
export async function getCurrentWorkspaceId(
  supabase: SupabaseClient,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();
  return (data?.organization_id as string | null) ?? null;
}
