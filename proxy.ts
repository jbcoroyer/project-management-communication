import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pkceCode = request.nextUrl.searchParams.get("code");

  // Si Supabase a renvoyé le code PKCE sur / ou /login (redirect_to = Site URL), envoyer vers le handler d'échange.
  if (pkceCode && (pathname === "/" || pathname === "/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  // Laisser passer les routes publiques (boîte à idées + questionnaire accessibles sans compte).
  // Attention : /questionnaire/reponses reste protégé (page interne du service Communication).
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/callback") ||
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

  // Lecture rapide de la session via cookies (sans round-trip vers Supabase Auth).
  // `getUser()` aurait ajout\u00e9 80\u2013200ms \u00e0 chaque navigation ; on garde getUser()
  // pour les actions sensibles c\u00f4t\u00e9 server actions / route handlers.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|login|ideas|api/public).*)"],
};
