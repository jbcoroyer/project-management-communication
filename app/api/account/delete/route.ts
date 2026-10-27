import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/server/supabaseServer";
import { createSupabaseAdmin } from "../../../../lib/server/supabaseAdmin";
import { SERVICE_COMMUNICATION_ORG_ID } from "../../../../lib/workspaceModules";

type Body = {
  password?: string;
  confirmation?: string;
};

/**
 * Suppression définitive du compte Auth Supabase (+ profil / memberships).
 * Les espaces perso dont l’utilisateur est le seul membre sont purgés.
 * L’espace Service Communication n’est jamais touché.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Body;
    const password = body.password ?? "";
    const confirmation = (body.confirmation ?? "").trim().toUpperCase();

    if (!password) {
      return NextResponse.json({ error: "Mot de passe requis." }, { status: 400 });
    }
    if (confirmation !== "SUPPRIMER") {
      return NextResponse.json(
        { error: "Tapez SUPPRIMER pour confirmer la suppression." },
        { status: 400 },
      );
    }

    const supabase = await createServerSupabase();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user?.email) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    // Vérifie le mot de passe avant toute destruction.
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (reauthErr) {
      return NextResponse.json({ error: "Mot de passe incorrect." }, { status: 403 });
    }

    const admin = createSupabaseAdmin();

    const { data: profile } = await admin
      .from("profiles")
      .select("team_member_id")
      .eq("id", user.id)
      .maybeSingle();
    const teamMemberId = (profile?.team_member_id as string | null) ?? null;

    const { data: memberships } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id);

    const orgIds = [
      ...new Set(
        ((memberships ?? []) as { organization_id: string }[]).map((m) =>
          String(m.organization_id),
        ),
      ),
    ].filter((id) => id !== SERVICE_COMMUNICATION_ORG_ID);

    const soloOrgIds: string[] = [];
    for (const orgId of orgIds) {
      const { count } = await admin
        .from("organization_members")
        .select("user_id", { count: "exact", head: true })
        .eq("organization_id", orgId);
      if ((count ?? 0) <= 1) {
        soloOrgIds.push(orgId);
      }
    }

    for (const orgId of soloOrgIds) {
      const { error: purgeErr } = await admin.rpc("purge_organization", {
        p_org_id: orgId,
      });
      if (purgeErr) {
        console.error("purge_organization failed", orgId, purgeErr);
        return NextResponse.json(
          { error: `Impossible de supprimer l’espace associé : ${purgeErr.message}` },
          { status: 500 },
        );
      }
    }

    const { error: deleteErr } = await admin.auth.admin.deleteUser(user.id);
    if (deleteErr) {
      return NextResponse.json(
        { error: `Suppression Auth échouée : ${deleteErr.message}` },
        { status: 500 },
      );
    }

    if (teamMemberId) {
      await admin.from("team_members").delete().eq("id", teamMemberId);
    }

    // Nettoyage session locale côté client après coup ; on tente quand même un signOut.
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur serveur" },
      { status: 500 },
    );
  }
}
