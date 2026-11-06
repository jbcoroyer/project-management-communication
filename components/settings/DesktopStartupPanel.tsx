"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUpCircle, Loader2, Power, RefreshCw } from "lucide-react";
import { isTuesdayDesktop } from "../../lib/desktop";
import { useDesktopUpdate } from "../../lib/useDesktopUpdate";

type StartupState = {
  openAtLogin: boolean;
  version?: string;
};

/** Réglages app bureau : démarrage Windows + vérification des mises à jour. */
export default function DesktopStartupPanel() {
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<StartupState | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkingManual, setCheckingManual] = useState(false);
  const {
    updateReady,
    downloading,
    checking,
    version: updateVersion,
    installUpdate,
    checkForUpdates,
  } = useDesktopUpdate();

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

  const handleCheckUpdates = async () => {
    if (checkingManual || downloading || checking) return;
    setCheckingManual(true);
    try {
      await checkForUpdates();
    } finally {
      // Laisse le temps aux events updater d’arriver
      setTimeout(() => setCheckingManual(false), 800);
    }
  };

  const checkBusy = checkingManual || checking || downloading;

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
            Application Windows
          </h2>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
            Démarrage automatique et mises à jour.
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {updateReady ? (
          <button
            type="button"
            onClick={() => void installUpdate()}
            className="ui-btn ui-btn-accent h-9 justify-center gap-2 px-3 text-xs"
          >
            <ArrowUpCircle className="h-3.5 w-3.5" aria-hidden />
            Mettre à jour
            {updateVersion ? ` · ${updateVersion}` : ""}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleCheckUpdates()}
            disabled={checkBusy}
            className="ui-btn ui-btn-secondary h-9 justify-center gap-2 px-3 text-xs disabled:opacity-60"
          >
            {checkBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            )}
            {downloading
              ? `Téléchargement${updateVersion ? ` ${updateVersion}` : ""}…`
              : checking || checkingManual
                ? "Vérification…"
                : "Vérifier mise à jour"}
          </button>
        )}
        <p className="text-[11px] text-[color:var(--foreground)]/40 sm:ml-1">
          Recherche une nouvelle version de l’application Windows.
        </p>
      </div>
    </section>
  );
}
