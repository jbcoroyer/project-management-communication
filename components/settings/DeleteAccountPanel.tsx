"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { toastError } from "../../lib/toast";

export default function DeleteAccountPanel() {
  const { user } = useCurrentUser();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const canSubmit =
    Boolean(password) && confirmation.trim().toUpperCase() === "SUPPRIMER" && !busy;

  const handleDelete = async () => {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          confirmation: confirmation.trim(),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Suppression impossible.");
      }
      window.location.href = "/login?deleted=1";
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  if (!user) return null;

  return (
    <section className="ui-surface space-y-4 rounded-2xl border border-red-200/80 p-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">
          Zone sensible
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">
          Supprimer mon compte
        </h2>
        <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
          Action définitive : votre compte Auth Supabase est effacé. Vous pourrez vous
          réinscrire plus tard avec la même adresse, mais les données liées à votre
          compte (et vos espaces perso dont vous êtes le seul membre) seront perdues.
          L’espace Service Communication n’est pas supprimé.
        </p>
      </header>

      {!open ? (
        <button
          type="button"
          className="ui-btn border border-red-300 bg-red-50 text-red-800 hover:bg-red-100"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Supprimer définitivement mon compte
        </button>
      ) : (
        <div className="space-y-3 rounded-xl border border-red-200 bg-red-50/60 p-4">
          <p className="text-sm text-red-900/80">
            Compte : <span className="font-medium">{user.email}</span>
          </p>
          <div>
            <label
              htmlFor="delete-password"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-red-900/70"
            >
              Mot de passe
            </label>
            <input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="ui-input w-full"
              placeholder="Votre mot de passe"
            />
          </div>
          <div>
            <label
              htmlFor="delete-confirm"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-red-900/70"
            >
              Tapez SUPPRIMER pour confirmer
            </label>
            <input
              id="delete-confirm"
              type="text"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              className="ui-input w-full"
              placeholder="SUPPRIMER"
              autoCapitalize="characters"
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => void handleDelete()}
              className="ui-btn bg-red-700 text-white hover:bg-red-800 disabled:opacity-50"
            >
              {busy ? "Suppression…" : "Confirmer la suppression"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setPassword("");
                setConfirmation("");
              }}
              className="ui-btn ui-btn-ghost"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
