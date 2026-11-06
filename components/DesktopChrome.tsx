"use client";

import { useEffect } from "react";
import type { TuesdayDesktopApi } from "../lib/desktop";

declare global {
  interface Window {
    tuesdayDesktop?: TuesdayDesktopApi;
  }
}

/** Marque le document en mode app bureau (barre de titre + scrollbars). */
export default function DesktopChrome() {
  useEffect(() => {
    if (!window.tuesdayDesktop?.isDesktop) return;
    document.documentElement.classList.add("tuesday-desktop");
    document.documentElement.dataset.desktopPlatform =
      window.tuesdayDesktop.platform;
    return () => {
      document.documentElement.classList.remove("tuesday-desktop");
      delete document.documentElement.dataset.desktopPlatform;
    };
  }, []);

  return null;
}
