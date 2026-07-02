"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarCheck2, CalendarX2, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { requestOutlookSyncAll } from "../lib/outlookClientSync";
import { getPublicAppOrigin } from "../lib/publicAppUrl";
import { toastError, toastSuccess } from "../lib/toast";

type StatusResponse = {
  configured: boolean;
  connected: boolean;
  email?: string | null;
};

export default function OutlookConnectionCard() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/outlook/status", { cache: "no-store" });
      const data = (await res.json()) as StatusResponse;
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const handleSyncAll = useCallback(async () => {
    setBusy(true);
    try {
      const result = await requestOutlookSyncAll();
      if (!result.ok) {
        toastError(result.error ?? "Impossible de synchroniser l'agenda Outlook.");
        return;
      }
      if (!result.connected) {
        toastError("Outlook n'est pas connecté.");
        return;
      }
      if ((result.errors ?? 0) > 0) {
        toastError(
          `${result.synced ?? 0} tâche(s) OK, ${result.errors} en échec. Cause : ${
            result.firstError ?? "inconnue"
          }`,
        );
        return;
      }
      if ((result.considered ?? 0) === 0) {
        toastError(
          `Aucune tâche planifiée ne vous est attribuée (${result.scanned ?? 0} tâche(s) examinée(s)). Vérifiez que vous êtes bien responsable et qu'un créneau est renseigné.`,
        );
        return;
      }
      toastSuccess(`${result.synced ?? 0} tâche(s) synchronisée(s) vers Outlook.`);
    } finally {
      setBusy(false);
    }
  }, []);

  // Affiche un toast au retour de la redirection OAuth (?outlook=...).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const outlook = params.get("outlook");
    if (!outlook) return;
    if (outlook === "connected") {
      toastSuccess("Agenda Outlook connecté.");
      void requestOutlookSyncAll().then((result) => {
        if (result.ok && (result.synced ?? 0) > 0) {
          toastSuccess(`${result.synced} tâche(s) planifiée(s) envoyée(s) vers Outlook.`);
        }
      });
    } else if (outlook === "not_configured")
      toastError("Microsoft 365 n'est pas configuré côté serveur (variables MS_*).");
    else if (outlook === "state_mismatch") toastError("Échec de sécurité OAuth, réessayez.");
    else if (outlook === "error") toastError("La connexion à Outlook a échoué.");
    params.delete("outlook");
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
    window.history.replaceState({}, "", next);
  }, []);

  const handleDisconnect = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/outlook/disconnect", { method: "POST" });
      if (!res.ok) throw new Error();
      toastSuccess("Agenda Outlook déconnecté.");
      await loadStatus();
    } catch {
      toastError("Impossible de déconnecter Outlook.");
    } finally {
      setBusy(false);
    }
  }, [loadStatus]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-[color:var(--foreground)]/60">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement de l&apos;état de connexion…
      </div>
    );
  }

  if (status && !status.configured) {
    const isLocal =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        L&apos;intégration Microsoft 365 n&apos;est pas encore configurée côté serveur. Renseignez{" "}
        <code className="mx-1 rounded bg-amber-100 px-1">MS_CLIENT_ID</code>,{" "}
        <code className="mx-1 rounded bg-amber-100 px-1">MS_CLIENT_SECRET</code> et{" "}
        <code className="mx-1 rounded bg-amber-100 px-1">MS_TENANT_ID</code>{" "}
        {isLocal ? (
          <>
            dans <code className="mx-1 rounded bg-amber-100 px-1">.env.local</code>.
          </>
        ) : (
          <>
            dans les variables d&apos;environnement Vercel (Production), puis redéployez. Ajoutez
            aussi l&apos;URI de redirection{" "}
            <code className="mx-1 rounded bg-amber-100 px-1 break-all">
              {`${getPublicAppOrigin() || "https://project-management-communication.vercel.app"}/api/outlook/callback`}
            </code>{" "}
            dans Azure (App registration → Authentication).
          </>
        )}
      </div>
    );
  }

  if (status?.connected) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CalendarCheck2 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Outlook connecté</p>
            <p className="text-xs text-[color:var(--foreground)]/60">
              {status.email ?? "Compte Microsoft 365"} · catégorie{" "}
              <strong>IDENA Planification</strong> (orange) dans Outlook.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSyncAll()}
            disabled={busy}
            className="ui-transition flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[color:var(--foreground)]/70 hover:bg-[var(--surface)] disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Synchroniser
          </button>
          <button
            type="button"
            onClick={() => void loadStatus()}
            className="ui-transition flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[color:var(--foreground)]/70 hover:bg-[var(--surface)]"
          >
            Actualiser
          </button>
          <button
            type="button"
            onClick={() => void handleDisconnect()}
            disabled={busy}
            className="ui-transition flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-100 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarX2 className="h-3.5 w-3.5" />}
            Déconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="max-w-md text-sm text-[color:var(--foreground)]/65">
        Connectez votre compte Microsoft 365 pour que chaque jour ou créneau planifié sur une tâche
        soit ajouté automatiquement à votre agenda Outlook.
      </p>
      <a
        href={`${getPublicAppOrigin() || ""}/api/outlook/connect`}
        className="ui-transition inline-flex items-center gap-2 rounded-xl bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:opacity-90"
      >
        <ExternalLink className="h-4 w-4" />
        Connecter Outlook
      </a>
    </div>
  );
}
