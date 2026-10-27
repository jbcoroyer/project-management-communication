"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { fallbackReferenceData, type ReferenceRecord } from "./referenceData";
import { getSupabaseBrowser } from "./supabaseBrowser";
import { useWorkspace } from "./workspaceContext";

type ReferenceDataState = {
  admins: ReferenceRecord[];
  companies: ReferenceRecord[];
  domains: ReferenceRecord[];
  columns: ReferenceRecord[];
  loading: boolean;
};

type TeamMemberRecord = {
  id?: string;
  display_name?: string;
  avatar_url?: string | null;
};

type CompanyRecord = {
  id?: string;
  name?: string;
  logo_url?: string | null;
};

type DomainRecord = {
  id?: string;
  name?: string;
  color?: string | null;
};

type ColumnRecord = {
  id?: string;
  name?: string;
};

const ReferenceDataContext = createContext<ReferenceDataState | null>(null);

export function ReferenceDataProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const { workspaceId, loading: workspaceLoading } = useWorkspace();
  const [state, setState] = useState<ReferenceDataState>({
    ...fallbackReferenceData,
    loading: true,
  });
  const reloadTimerRef = useRef<number | null>(null);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setState({ ...fallbackReferenceData, loading: false });
      return;
    }
    const [adminsRes, companiesRes, domainsRes, columnsRes] = await Promise.all([
      supabase
        .from("team_members")
        .select("id, display_name, avatar_url")
        .eq("organization_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("companies")
        .select("id, name, logo_url")
        .eq("organization_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("domains")
        .select("id, name, color")
        .eq("organization_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("workflow_columns")
        .select("id, name")
        .eq("organization_id", workspaceId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

    const admins =
      ((adminsRes.data ?? []) as TeamMemberRecord[])
        .map((item) => ({
          id: String(item.id ?? ""),
          name: String(item.display_name ?? ""),
          avatarUrl: item.avatar_url ?? null,
        }))
        .filter((item) => item.id && item.name) || [];

    const companies =
      ((companiesRes.data ?? []) as CompanyRecord[])
        .map((item) => ({
          id: String(item.id ?? ""),
          name: String(item.name ?? ""),
          logoUrl: item.logo_url ?? null,
        }))
        .filter((item) => item.id && item.name) || [];

    const domains =
      ((domainsRes.data ?? []) as DomainRecord[])
        .map((item) => ({
          id: String(item.id ?? ""),
          name: String(item.name ?? ""),
          color: item.color ?? null,
        }))
        .filter((item) => item.id && item.name) || [];

    const columns =
      ((columnsRes.data ?? []) as ColumnRecord[])
        .map((item) => ({
          id: String(item.id ?? ""),
          name: String(item.name ?? ""),
        }))
        .filter((item) => item.id && item.name) || [];

    loadedRef.current = true;
    setState({
      admins,
      companies: companies.length > 0 ? companies : fallbackReferenceData.companies,
      domains: domains.length > 0 ? domains : fallbackReferenceData.domains,
      columns: columns.length > 0 ? columns : fallbackReferenceData.columns,
      loading: false,
    });
  }, [supabase, workspaceId]);

  useEffect(() => {
    if (workspaceLoading) return;
    let cancelled = false;
    const runLoad = async () => {
      try {
        await load();
      } catch {
        if (!cancelled) setState((prev) => ({ ...prev, loading: false }));
      }
    };

    void runLoad();

    if (!workspaceId) {
      return () => {
        cancelled = true;
      };
    }

    const scheduleReload = () => {
      if (reloadTimerRef.current) {
        window.clearTimeout(reloadTimerRef.current);
      }
      reloadTimerRef.current = window.setTimeout(() => {
        void runLoad();
      }, 120);
    };

    const channel = supabase
      .channel(`reference-data-${workspaceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "team_members" }, () => {
        scheduleReload();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "companies" }, () => {
        scheduleReload();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "domains" }, () => {
        scheduleReload();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "workflow_columns" }, () => {
        scheduleReload();
      })
      .subscribe();

    return () => {
      cancelled = true;
      if (reloadTimerRef.current) {
        window.clearTimeout(reloadTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [load, supabase, workspaceId, workspaceLoading]);

  return (
    <ReferenceDataContext.Provider value={state}>{children}</ReferenceDataContext.Provider>
  );
}

export function useReferenceData(): ReferenceDataState {
  const ctx = useContext(ReferenceDataContext);
  if (!ctx) {
    throw new Error("useReferenceData doit être utilisé sous ReferenceDataProvider.");
  }
  return ctx;
}
