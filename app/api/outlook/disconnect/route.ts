import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/server/supabaseServer";
import { deleteOutlookConnection } from "../../../../lib/server/outlookSync";

/** Déconnecte Outlook : supprime jetons et associations d'événements.
 * Les événements déjà créés dans l'agenda Outlook ne sont pas supprimés. */
export async function POST() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  await deleteOutlookConnection(user.id);
  return NextResponse.json({ ok: true });
}
