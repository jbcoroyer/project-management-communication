"use client";

import { useAppVersion } from "../lib/appVersionContext";

export default function AppVersionToggle() {
  const { version, switchVersion, isSwitching } = useAppVersion();

  const pill = (target: "v1" | "v2", label: string) => {
    const active = version === target;
    return (
      <button
        type="button"
        disabled={isSwitching}
        onClick={() => switchVersion(target)}
        className={[
          "ui-transition rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] disabled:opacity-50",
          active
            ? "bg-[var(--foreground)] text-[var(--accent-contrast)] shadow-sm"
            : "text-[color:var(--foreground)]/50 hover:text-[var(--foreground)]",
        ].join(" ")}
        aria-pressed={active}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-full border border-[var(--line)] bg-[var(--surface)] p-0.5 shadow-[var(--shadow-1)]"
      role="group"
      aria-label="Version de l'interface"
    >
      {pill("v2", "V2")}
      {pill("v1", "V1")}
    </div>
  );
}
