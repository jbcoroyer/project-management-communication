"use client";

import { useCallback, useEffect, useState } from "react";
import type { DesktopUpdateStatus } from "./desktop";
import { isTuesdayDesktop } from "./desktop";

const IDLE: DesktopUpdateStatus = { status: "idle" };

/** État de mise à jour de l’app bureau Electron (bouton profil). */
export function useDesktopUpdate() {
  const [status, setStatus] = useState<DesktopUpdateStatus>(IDLE);
  const desktop = typeof window !== "undefined" && isTuesdayDesktop();

  useEffect(() => {
    if (!desktop || !window.tuesdayDesktop) return;

    let cancelled = false;
    void window.tuesdayDesktop.getUpdateStatus().then((s) => {
      if (!cancelled) setStatus(s);
    });

    const unsubscribe = window.tuesdayDesktop.onUpdateStatus((s) => {
      setStatus(s);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [desktop]);

  const installUpdate = useCallback(async () => {
    if (!window.tuesdayDesktop) return;
    await window.tuesdayDesktop.installUpdate();
  }, []);

  const updateReady = desktop && status.status === "ready";
  const downloading =
    desktop && (status.status === "downloading" || status.status === "available");

  return {
    desktop,
    status,
    updateReady,
    downloading,
    version: status.version,
    installUpdate,
  };
}
