import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/server/supabaseServer";
import { createSupabaseAdmin } from "../../../../lib/server/supabaseAdmin";
import { exchangeCodeForTokens, fetchGraphUser } from "../../../../lib/server/microsoftGraph";
import { getOutlookRedirectUri } from "../../../../lib/server/outlookRedirect";

/** Étape 2 du flux OAuth : Microsoft renvoie un code, on l'échange contre des jetons. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const settings = (status: string) => new URL(`/settings?outlook=${status}`, origin);

  const error = searchParams.get("error");
  if (error) {
    return NextResponse.redirect(settings("error"));
  }

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expectedState = request.cookies.get("ms_oauth_state")?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(settings("state_mismatch"));
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  try {
    const redirectUri = getOutlookRedirectUri(request.url);
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const graphUser = await fetchGraphUser(tokens.access_token);

    const admin = createSupabaseAdmin();
    await admin.from("outlook_connections").upsert(
      {
        user_id: user.id,
        ms_user_id: graphUser.id,
        account_email: graphUser.mail ?? graphUser.userPrincipalName ?? null,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? "",
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        scope: tokens.scope ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    const response = NextResponse.redirect(settings("connected"));
    response.cookies.delete("ms_oauth_state");
    return response;
  } catch (e) {
    console.error("Outlook OAuth callback error", e);
    return NextResponse.redirect(settings("error"));
  }
}
