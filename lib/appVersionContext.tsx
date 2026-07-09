"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  APP_VERSION_STORAGE_KEY,
  detectVersionFromPath,
  type AppVersion,
  toV1Path,
  toV2Path,
} from "./appVersion";

type AppVersionContextValue = {
  version: AppVersion;
  switchVersion: (target: AppVersion) => void;
  isSwitching: boolean;
};

const AppVersionContext = createContext<AppVersionContextValue | null>(null);

export function AppVersionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const pathVersion = detectVersionFromPath(pathname);
  const [version, setVersion] = useState<AppVersion>(pathVersion);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    setVersion(pathVersion);
    setIsSwitching(false);
    try {
      window.localStorage.setItem(APP_VERSION_STORAGE_KEY, pathVersion);
    } catch {
      // Préférence locale optionnelle
    }
  }, [pathVersion]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.appVersion = pathVersion;
    return () => {
      delete document.documentElement.dataset.appVersion;
    };
  }, [pathVersion]);

  const switchVersion = useCallback(
    (target: AppVersion) => {
      if (target === version) return;

      const nextPath = target === "v2" ? toV2Path(pathname) : toV1Path(pathname);
      setVersion(target);
      setIsSwitching(true);

      try {
        window.localStorage.setItem(APP_VERSION_STORAGE_KEY, target);
      } catch {
        // Préférence locale optionnelle
      }

      router.push(nextPath);
    },
    [pathname, router, version],
  );

  const value = useMemo(
    () => ({
      version,
      switchVersion,
      isSwitching,
    }),
    [version, switchVersion, isSwitching],
  );

  return <AppVersionContext.Provider value={value}>{children}</AppVersionContext.Provider>;
}

export function useAppVersion(): AppVersionContextValue {
  const ctx = useContext(AppVersionContext);
  if (!ctx) {
    throw new Error("useAppVersion doit être utilisé dans AppVersionProvider");
  }
  return ctx;
}
