"use client";

import { Layers } from "lucide-react";
import { useAppVersion } from "../../lib/appVersionContext";

export default function AppVersionSettings() {
  const { version, switchVersion, isSwitching } = useAppVersion();
  const onV2 = version === "v2";

  return (
    <div className="ui-surface overflow-hidden rounded-2xl">
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-soft)]">
          <Layers className="h-5 w-5 text-[color:var(--foreground)]/45" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-[var(--foreground)]">Interface V1</h2>
          <p className="text-xs text-[color:var(--foreground)]/60">
            Thuesday utilise la V2 par défaut. Activez la V1 pour l&apos;interface classique.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={!onV2}
          disabled={isSwitching}
          onClick={() => switchVersion(onV2 ? "v1" : "v2")}
          className={[
            "ui-transition relative h-7 w-12 shrink-0 rounded-full border disabled:opacity-50",
            !onV2
              ? "border-[var(--accent)] bg-[var(--accent)]"
              : "border-[var(--line)] bg-[var(--surface-soft)]",
          ].join(" ")}
        >
          <span
            className={[
              "ui-transition absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm",
              !onV2 ? "left-[calc(100%-1.375rem)]" : "left-0.5",
            ].join(" ")}
          />
        </button>
      </div>
      <div className="px-5 py-3">
        <p className="text-xs text-[color:var(--foreground)]/50">
          {onV2
            ? "Vous êtes sur l'interface V2 (recommandée). Utilisez le sélecteur en haut ou ce bouton pour passer en V1."
            : "Vous utilisez l'interface V1 classique. Réactivez la V2 pour retrouver l'expérience par défaut."}
        </p>
      </div>
    </div>
  );
}
