"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "../../../lib/supabaseBrowser";

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const next = params.get("next") || "/";
      if (!code) {
        if (active) setError("Lien invalide : code de vérification manquant.");
        return;
      }
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        if (active) setError(exchangeError.message);
        return;
      }
      router.replace(next);
    };
    void run();
    return () => {
      active = false;
    };
  }, [router, supabase]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10">
        <div className="ui-surface w-full max-w-md rounded-2xl p-6">
          <h1 className="text-lg font-semibold text-[var(--foreground)]">Lien de récupération invalide</h1>
          <p className="mt-2 text-sm text-rose-700">{error}</p>
          <Link
            href="/login"
            className="mt-4 inline-flex rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-10">
      <div className="ui-surface w-full max-w-md rounded-2xl p-6">
        <h1 className="text-lg font-semibold text-[var(--foreground)]">Vérification en cours…</h1>
        <p className="mt-2 text-sm text-[color:var(--foreground)]/60">
          Nous validons votre lien sécurisé pour réinitialiser le mot de passe.
        </p>
      </div>
    </div>
  );
}
