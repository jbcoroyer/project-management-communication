"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "./supabaseBrowser";
import { mapTaskRow } from "./taskMappers";
import { TASK_SELECT_WITH_EVENT } from "./taskQueries";
import type { Task } from "./types";

export function useEventTasks(eventId: string | null) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTasks = useCallback(async () => {
    if (!eventId) {
      setTasks([]);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tasks")
        .select(TASK_SELECT_WITH_EVENT)
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setTasks((data ?? []).map(mapTaskRow));
    } finally {
      setLoading(false);
    }
  }, [eventId, supabase]);

  useEffect(() => {
    void loadTasks().catch(() => setTasks([]));
  }, [loadTasks]);

  useEffect(() => {
    if (!eventId) return;
    const channel = supabase
      .channel(`event-tasks-${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        void loadTasks().catch(() => {});
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, loadTasks, supabase]);

  return useMemo(
    () => ({
      tasks,
      loading,
      loadTasks,
    }),
    [tasks, loading, loadTasks],
  );
}
