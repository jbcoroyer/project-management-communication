"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "./supabaseBrowser";
import { projectStatuses, type ProjectStatus, type StockProject, type StockProjectDraft } from "./stockTypes";

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

  useEffect(() => {
    const channel = supabase
      .channel("stock-projects-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => {
        void loadProjects().catch(() => {});
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadProjects, supabase]);

  const createProject = useCallback(
    async (draft: StockProjectDraft) => {
      const { error } = await supabase.from("projects").insert({
        name: draft.name.trim(),
        status: draft.status,
      });
      if (error) throw error;
      await loadProjects();
    },
    [loadProjects, supabase],
  );

  return useMemo(
    () => ({
      projects,
      loading,
      loadProjects,
      createProject,
    }),
    [projects, loading, loadProjects, createProject],
  );
}
