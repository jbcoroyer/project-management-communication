import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { toV3Path } from "./lib/appVersion";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pkceCode = request.nextUrl.searchParams.get("code");

  // Si Supabase a renvoyé le code PKCE sur / ou /login (redirect_to = Site URL), envoyer vers le handler d'échange.
  if (pkceCode && (pathname === "/" || pathname === "/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  // Interface unique V3 — rediriger les anciennes URLs V1/V2 (sauf /ideas public).
  const isLegacyVersioned =
    pathname === "/v2" ||
    pathname.startsWith("/v2/") ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/events" ||
    pathname.startsWith("/events/") ||
    pathname === "/social" ||
    pathname.startsWith("/social/") ||
    pathname === "/stock" ||
    pathname.startsWith("/stock/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/");
  if (isLegacyVersioned) {
    const url = request.nextUrl.clone();
    url.pathname = toV3Path(pathname);
    return NextResponse.redirect(url);
  }

  // Laisser passer les routes publiques (boîte à idées + questionnaire accessibles sans compte).
  // Attention : /questionnaire/reponses reste protégé (page interne du service Communication).
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/ideas") ||
    pathname === "/questionnaire" ||
    pathname.startsWith("/questionnaire/f/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Valide le JWT auprès de Supabase Auth (pas seulement les cookies locaux).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|ideas|api/public).*)"],
};
