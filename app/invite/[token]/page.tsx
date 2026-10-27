"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseBrowser } from "../../../lib/supabaseBrowser";
import { TuesdayLoader } from "@/components/brand";
import { ServiceCommunicationIdenaHeading } from "../../../components/IdenaBrand";

export default function AcceptInvitePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [status, setStatus] = useState<"loading" | "need-login" | "ok" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Lien d'invitation invalide.");
      return;
    }

    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) {
          setStatus("need-login");
          const next = `/invite/${token}`;
          window.sessionStorage.setItem("tuesday.postLoginRedirect", next);
        }
        return;
      }

      const { error } = await supabase.rpc("accept_organization_invite", { p_token: token });
      if (cancelled) return;
      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }
      setStatus("ok");
      setMessage("Vous avez rejoint l'espace. Redirection…");
      window.setTimeout(() => {
        router.replace("/v3/dashboard/kanban");
        router.refresh();
      }, 800);
    })().catch((e) => {
      if (!cancelled) {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : String(e));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router, supabase, token]);

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-10">
      <div className="mx-auto max-w-lg space-y-6">
        <ServiceCommunicationIdenaHeading size="login">
          <p className="mt-2 text-sm text-[color:var(--foreground)]/60">Invitation à un espace</p>
        </ServiceCommunicationIdenaHeading>

        <div className="ui-surface rounded-2xl p-6">
          {status === "loading" ? (
            <div className="flex items-center gap-3 text-sm text-[color:var(--foreground)]/60">
              <TuesdayLoader />
              Traitement de l&apos;invitation…
            </div>
          ) : null}

          {status === "need-login" ? (
            <div className="space-y-4 text-sm">
              <p>Connectez-vous avec l&apos;adresse @idena.fr invitée pour rejoindre cet espace.</p>
              <Link
                href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
                className="ui-btn ui-btn-primary inline-flex"
              >
                Se connecter
              </Link>
            </div>
          ) : null}

          {status === "ok" ? (
            <p className="text-sm text-emerald-800">{message}</p>
          ) : null}

          {status === "error" ? (
            <div className="space-y-3 text-sm">
              <p className="text-red-700">{message}</p>
              <Link href="/v3/dashboard/kanban" className="ui-btn ui-btn-ghost inline-flex">
                Retour à l&apos;app
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
