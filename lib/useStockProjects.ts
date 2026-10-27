"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "./supabaseBrowser";
import { useRealtimeReload } from "./useRealtimeReload";
import { projectStatuses, type ProjectStatus, type StockProject } from "./stockTypes";
import { useWorkspace } from "./workspaceContext";

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
  const { workspaceId } = useWorkspace();
  const [projects, setProjects] = useState<StockProject[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    if (!workspaceId) {
      setProjects([]);
      setLoading(false);
      return;
    }
    try {
      // loading silencieux après le 1er fetch
      const { data, error } = await supabase
        .from("projects")
        .select("id, created_at, name, status")
        .eq("organization_id", workspaceId)
        .order("status", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      setProjects(((data ?? []) as StockProjectRow[]).map(mapProjectRow));
    } finally {
      setLoading(false);
    }
  }, [supabase, workspaceId]);

  useEffect(() => {
    void loadProjects().catch(() => {
      setProjects([]);
    });
  }, [loadProjects]);

  useRealtimeReload({
    table: "projects",
    channelName: workspaceId ? `stock-projects-ws-${workspaceId}` : "stock-projects-realtime",
    enabled: Boolean(workspaceId),
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
