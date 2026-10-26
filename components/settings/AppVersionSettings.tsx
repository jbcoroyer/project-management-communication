"use client";

import { Layers } from "lucide-react";
import type { AppVersion } from "../../lib/appVersion";
import { useAppVersion } from "../../lib/appVersionContext";

const OPTIONS: { id: AppVersion; title: string; description: string }[] = [
  {
    id: "v3",
    title: "V3 — Light",
    description: "Interface épurée : tâches, événements, médias, stock et idées.",
  },
  {
    id: "v2",
    title: "V2 — Complète",
    description: "Toutes les fonctions avancées (planning, demandes, OKR, réseaux…).",
  },
  {
    id: "v1",
    title: "V1 — Classique",
    description: "Interface historique, plus dense.",
  },
];

export default function AppVersionSettings() {
  const { version, switchVersion, isSwitching } = useAppVersion();

  return (
    <div className="ui-surface overflow-hidden rounded-2xl">
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-soft)]">
          <Layers className="h-5 w-5 text-[color:var(--foreground)]/45" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-[var(--foreground)]">Version de l&apos;interface</h2>
          <p className="text-xs text-[color:var(--foreground)]/60">
            V3 est l&apos;interface par défaut. Vous pouvez basculer vers V2 ou V1 à tout moment.
          </p>
        </div>
      </div>
      <div className="grid gap-2 p-4 sm:grid-cols-3">
        {OPTIONS.map((option) => {
          const active = version === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={isSwitching}
              onClick={() => switchVersion(option.id)}
              className={[
                "ui-transition rounded-2xl border px-4 py-3 text-left disabled:opacity-50",
                active
                  ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--accent-contrast)] shadow-sm"
                  : "border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-soft)]",
              ].join(" ")}
              aria-pressed={active}
            >
              <p className="text-sm font-semibold">{option.title}</p>
              <p
                className={[
                  "mt-1 text-[11px] leading-snug",
                  active ? "text-[var(--accent-contrast)]/75" : "text-[color:var(--foreground)]/55",
                ].join(" ")}
              >
                {option.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
