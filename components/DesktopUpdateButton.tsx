"use client";

import { ArrowUpCircle, Loader2 } from "lucide-react";
import { useDesktopUpdate } from "../lib/useDesktopUpdate";

/** Bouton « Mettre à jour » près du profil — visible seulement si une MAJ bureau est prête. */
export default function DesktopUpdateButton() {
  const { updateReady, downloading, version, installUpdate } = useDesktopUpdate();

  if (downloading) {
    return (
      <div
        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[color:var(--foreground)]/55"
        role="status"
      >
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
        <span className="truncate">
          Téléchargement{version ? ` ${version}` : ""}…
        </span>
      </div>
    );
  }

  if (!updateReady) return null;

  return (
    <button
      type="button"
      onClick={() => void installUpdate()}
      className="ui-btn ui-btn-accent h-8 w-full justify-start gap-2 px-2.5 text-[11px]"
      title={version ? `Installer Tuesday ${version}` : "Installer la mise à jour"}
    >
      <ArrowUpCircle className="h-3.5 w-3.5" aria-hidden />
      Mettre à jour
      {version ? (
        <span className="ml-auto truncate opacity-80">{version}</span>
      ) : null}
    </button>
  );
}
