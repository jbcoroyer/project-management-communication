"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, EyeOff, KeyRound } from "lucide-react";
import { getSupabaseBrowser } from "../../../lib/supabaseBrowser";
import { ServiceCommunicationIdenaHeading } from "../../../components/IdenaBrand";

function translateResetError(message: string): string {
  if (message.includes("Password should be at least")) {
    return "Le mot de passe doit contenir au moins 6 caractères.";
  }
  if (message.includes("session_not_found")) {
    return "Lien invalide ou expiré. Demandez un nouvel email de réinitialisation.";
  }
  return message;
}

export default function ResetPasswordPage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [canReset, setCanReset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;
      setCanReset(Boolean(session));
      setReady(true);
    };
    void init();

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        setCanReset(Boolean(session));
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canReset) {
      setError("Lien invalide ou expiré. Recommencez depuis \"Mot de passe oublié\".");
      return;
    }
    if (!password || !confirm) {
      setError("Veuillez remplir les deux champs.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess("Mot de passe mis à jour. Vous pouvez maintenant vous connecter.");
      setPassword("");
      setConfirm("");
    } catch (err: unknown) {
      setError(translateResetError(err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-12">
      <div className="w-full max-w-md">
        <ServiceCommunicationIdenaHeading size="login">
          <p className="mt-2 text-sm text-[color:var(--foreground)]/60">
            Définissez votre nouveau mot de passe.
          </p>
        </ServiceCommunicationIdenaHeading>

        <div className="ui-surface rounded-2xl p-6">
          {!ready ? (
            <p className="text-sm text-[color:var(--foreground)]/60">Chargement…</p>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div>
                <label
                  htmlFor="new-password"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/55"
                >
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--foreground)]/40" />
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(ev) => setPassword(ev.target.value)}
                    className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] py-2.5 pl-10 pr-10 text-sm"
                    autoComplete="new-password"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--foreground)]/40 hover:text-[color:var(--foreground)]/70"
                    aria-label={showPassword ? "Masquer" : "Afficher"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/55"
                >
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  value={confirm}
                  onChange={(ev) => setConfirm(ev.target.value)}
                  className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-2.5 text-sm"
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !canReset}
                className="ui-transition w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[#fffdf9] shadow-[0_14px_30px_rgba(20,17,13,0.18)] hover:-translate-y-0.5 hover:bg-[var(--accent-strong)] disabled:opacity-60"
              >
                {loading ? "Mise à jour..." : "Mettre à jour mon mot de passe"}
              </button>
            </form>
          )}
        </div>

        <Link
          href="/login"
          className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--foreground)]/55 hover:text-[color:var(--foreground)]/75"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
