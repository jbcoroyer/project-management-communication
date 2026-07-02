"use client";

import { FlaskConical } from "lucide-react";
import { useAppVersion } from "../../lib/appVersionContext";

export default function AppVersionSettings() {
  const { version, switchVersion, isSwitching } = useAppVersion();
  const v2Enabled = version === "v2";

  return (
    <div className="ui-surface overflow-hidden rounded-2xl">
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-soft)]">
          <FlaskConical className="h-5 w-5 text-[color:var(--foreground)]/45" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-[var(--foreground)]">Interface avancée</h2>
          <p className="text-xs text-[color:var(--foreground)]/60">
            Active la version expérimentale (vue liste, assistant, automatisations).
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={v2Enabled}
          disabled={isSwitching}
          onClick={() => switchVersion(v2Enabled ? "v1" : "v2")}
          className={[
            "ui-transition relative h-7 w-12 shrink-0 rounded-full border disabled:opacity-50",
            v2Enabled
              ? "border-[var(--accent)] bg-[var(--accent)]"
              : "border-[var(--line)] bg-[var(--surface-soft)]",
          ].join(" ")}
        >
          <span
            className={[
              "ui-transition absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm",
              v2Enabled ? "left-[calc(100%-1.375rem)]" : "left-0.5",
            ].join(" ")}
          />
        </button>
      </div>
      <div className="px-5 py-3">
        <p className="text-xs text-[color:var(--foreground)]/50">
          {v2Enabled
            ? "Vous utilisez l'interface avancée. Désactivez pour revenir à l'interface standard."
            : "Désactivée par défaut. Aucun changement visible tant que l'option est inactive."}
        </p>
      </div>
    </div>
  );
}
