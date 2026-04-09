"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fallbackReferenceData, type ReferenceRecord } from "./referenceData";
import { getSupabaseBrowser } from "./supabaseBrowser";

type State = {
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

export function useReferenceData() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [state, setState] = useState<State>({
    ...fallbackReferenceData,
    loading: true,
  });
  const reloadTimerRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    const [adminsRes, companiesRes, domainsRes, columnsRes] = await Promise.all([
      supabase
        .from("team_members")
        .select("id, display_name, avatar_url")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("companies")
        .select("id, name, logo_url")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("domains")
        .select("id, name, color")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("workflow_columns")
        .select("id, name")
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

    setState({
      admins,
      companies: companies.length > 0 ? companies : fallbackReferenceData.companies,
      domains: domains.length > 0 ? domains : fallbackReferenceData.domains,
      columns: columns.length > 0 ? columns : fallbackReferenceData.columns,
      loading: false,
    });
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    const runLoad = async () => {
      try {
        await load();
      } catch {
        if (!cancelled) setState((prev) => ({ ...prev, loading: false }));
      }
    };

    void runLoad();

    const scheduleReload = () => {
      if (reloadTimerRef.current) {
        window.clearTimeout(reloadTimerRef.current);
      }
      reloadTimerRef.current = window.setTimeout(() => {
        void runLoad();
      }, 120);
    };

    const channel = supabase
      .channel("reference-data-updates")
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
  }, [load, supabase]);

  return useMemo(() => state, [state]);
}
