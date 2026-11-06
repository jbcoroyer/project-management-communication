"use client";

import { useCallback, useEffect, useState } from "react";
import { Power } from "lucide-react";
import { isTuesdayDesktop } from "../../lib/desktop";

type StartupState = {
  openAtLogin: boolean;
  version?: string;
};

/** Réglage « lancer au démarrage » — visible uniquement dans l’app bureau. */
export default function DesktopStartupPanel() {
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<StartupState | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!window.tuesdayDesktop?.startup) return;
    const next = await window.tuesdayDesktop.startup.get();
    setState({ openAtLogin: next.openAtLogin, version: next.version });
  }, []);

  useEffect(() => {
    if (!isTuesdayDesktop() || !window.tuesdayDesktop?.startup) return;
    setVisible(true);
    void refresh();
    const unsub = window.tuesdayDesktop.startup.onChanged((s) => {
      setState((prev) => ({
        openAtLogin: s.openAtLogin,
        version: prev?.version,
      }));
    });
    return unsub;
  }, [refresh]);

  if (!visible || !state) return null;

  const toggle = async () => {
    if (!window.tuesdayDesktop?.startup || busy) return;
    setBusy(true);
    try {
      const next = await window.tuesdayDesktop.startup.set(!state.openAtLogin);
      setState((prev) => ({
        openAtLogin: next.openAtLogin,
        version: prev?.version,
      }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="ui-surface space-y-4 rounded-2xl p-5">
      <header className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-soft)] ring-1 ring-[var(--line)]">
          <Power className="h-4 w-4 text-[var(--accent)]" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            Application bureau
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">
            Lancement au démarrage
          </h2>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
            Ouvrir Tuesday automatiquement quand Windows démarre.
            {state.version ? (
              <span className="text-[color:var(--foreground)]/35">
                {" "}
                · v{state.version}
              </span>
            ) : null}
          </p>
        </div>
      </header>

      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)]/50 px-4 py-3">
        <span className="text-sm font-medium text-[var(--foreground)]">
          Lancer Tuesday au démarrage
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={state.openAtLogin}
          disabled={busy}
          onClick={() => void toggle()}
          className={[
            "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
            state.openAtLogin ? "bg-[var(--accent)]" : "bg-[var(--line-strong)]",
            busy ? "opacity-60" : "",
          ].join(" ")}
        >
          <span
            className={[
              "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
              state.openAtLogin ? "translate-x-5" : "translate-x-0",
            ].join(" ")}
          />
        </button>
      </label>
    </section>
  );
}
