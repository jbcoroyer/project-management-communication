"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "./supabaseBrowser";
import { useRealtimeReload } from "./useRealtimeReload";
import { projectStatuses, type ProjectStatus, type StockProject } from "./stockTypes";

type StockProjectRow = {
  id: string;
  created_at: string;
  name: string | null;
  status: string | null;
};

function normalizeProjectStatus(value: string | null | undefined): ProjectStatus {
  return projectStatuses.includes((value ?? "") as ProjectStatus) ? (value as ProjectStatus) : "Actif";
}

function mapProjectRow(row: StockProjectRow): StockProject {
  return {
    id: row.id,
    createdAt: row.created_at,
    name: row.name ?? "",
    status: normalizeProjectStatus(row.status),
  };
}

export function useStockProjects() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [projects, setProjects] = useState<StockProject[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("projects")
        .select("id, created_at, name, status")
        .order("status", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      setProjects(((data ?? []) as StockProjectRow[]).map(mapProjectRow));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadProjects().catch(() => {
      setProjects([]);
    });
  }, [loadProjects]);

  useRealtimeReload({
    table: "projects",
    channelName: "stock-projects-realtime",
    onChange: useCallback(() => {
      void loadProjects().catch(() => {});
    }, [loadProjects]),
  });

  return useMemo(
    () => ({
      projects,
      loading,
      loadProjects,
    }),
    [projects, loading, loadProjects],
  );
}
