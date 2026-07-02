import { randomBytes } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "../../../../lib/server/supabaseServer";
import { buildAuthorizeUrl, isMicrosoftConfigured } from "../../../../lib/server/microsoftGraph";
import { getOutlookRedirectUri } from "../../../../lib/server/outlookRedirect";

/** Étape 1 du flux OAuth : redirige l'utilisateur vers la page de connexion Microsoft. */
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);

  if (!isMicrosoftConfigured()) {
    return NextResponse.redirect(new URL("/settings?outlook=not_configured", origin));
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = getOutlookRedirectUri(request.url);
  const authorizeUrl = buildAuthorizeUrl(redirectUri, state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("ms_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
