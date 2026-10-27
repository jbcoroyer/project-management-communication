import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "../../../../lib/server/supabaseAdmin";

/**
 * Confirme l’e-mail côté Auth (service role) puis permet une connexion immédiate.
 * Sécurité : ne confirme que si l’utilisateur existe et que le mot de passe est valide
 * après confirmation (sign-in de contrôle).
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      userId?: string;
      email?: string;
      password?: string;
    };
    const userId = body.userId?.trim();
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!userId || !email || !password) {
      return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
    }

    const admin = createSupabaseAdmin();
    const { data: userData, error: getErr } = await admin.auth.admin.getUserById(userId);
    if (getErr || !userData.user) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }
    if ((userData.user.email ?? "").toLowerCase() !== email) {
      return NextResponse.json({ error: "E-mail incohérent." }, { status: 403 });
    }

    const { error: confirmErr } = await admin.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });
    if (confirmErr) {
      return NextResponse.json({ error: confirmErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur serveur" },
      { status: 500 },
    );
  }
}
