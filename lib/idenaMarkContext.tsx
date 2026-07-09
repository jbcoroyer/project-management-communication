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
import { getSupabaseBrowser } from "./supabaseBrowser";
import { getIdenaMarkCustomSrc } from "./idenaMarkSrc";

type IdenaMarkContextValue = {
  /** URL personnalisée (base ou .env) ; `null` = pictogramme SVG par défaut. */
  customSrc: string | null;
  dbUrl: string | null;
  loading: boolean;
  reload: () => Promise<void>;
};

const IdenaMarkContext = createContext<IdenaMarkContextValue | null>(null);

export function IdenaMarkProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [dbUrl, setDbUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("app_settings")
      .select("idena_mark_url")
      .eq("id", "default")
      .maybeSingle();

    if (error) {
      console.warn("[IdenaMark] app_settings:", error.message);
      setDbUrl(null);
      setLoading(false);
      return;
    }

    const url = data?.idena_mark_url;
    setDbUrl(typeof url === "string" && url.trim() !== "" ? url.trim() : null);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel("app_settings_idena_mark")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [supabase, load]);

  const customSrc = useMemo(() => {
    if (dbUrl) return dbUrl;
    return getIdenaMarkCustomSrc();
  }, [dbUrl]);

  const value = useMemo<IdenaMarkContextValue>(
    () => ({
      customSrc,
      dbUrl,
      loading,
      reload: load,
    }),
    [customSrc, dbUrl, loading, load],
  );

  return <IdenaMarkContext.Provider value={value}>{children}</IdenaMarkContext.Provider>;
}

export function useIdenaMark() {
  const ctx = useContext(IdenaMarkContext);
  if (!ctx) {
    return {
      customSrc: getIdenaMarkCustomSrc(),
      dbUrl: null,
      loading: false,
      reload: async () => {},
    };
  }
  return ctx;
}
