import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/server/supabaseServer";
import { getOutlookConnection } from "../../../../lib/server/outlookSync";
import { isMicrosoftConfigured } from "../../../../lib/server/microsoftGraph";

/** Renvoie l'état de connexion Outlook de l'utilisateur courant. */
export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ connected: false, configured: isMicrosoftConfigured() }, { status: 401 });
  }

  const conn = await getOutlookConnection(user.id);
  return NextResponse.json({
    configured: isMicrosoftConfigured(),
    connected: Boolean(conn),
    email: conn?.account_email ?? null,
  });
}
