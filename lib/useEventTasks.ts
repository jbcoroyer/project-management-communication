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

  const loadTasks = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!eventId) {
        setTasks([]);
        setLoading(false);
        return;
      }
      try {
        if (!opts?.silent) setLoading(true);
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
    },
    [eventId, supabase],
  );

  useEffect(() => {
    setTasks([]);
    if (!eventId) {
      setLoading(false);
      return;
    }
    void loadTasks().catch(() => setTasks([]));
  }, [eventId, loadTasks]);

  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`event-tasks-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `event_id=eq.${eventId}`,
        },
        (payload: { eventType?: string; old?: { id?: string }; new?: unknown }) => {
          if (payload.eventType === "DELETE") {
            const deletedId = payload.old?.id as string | undefined;
            if (!deletedId) return;
            setTasks((prev) => prev.filter((task) => task.id !== deletedId));
            return;
          }
          if (!payload.new) return;
          const mapped = mapTaskRow(payload.new);
          if (mapped.eventId && mapped.eventId !== eventId) {
            setTasks((prev) => prev.filter((task) => task.id !== mapped.id));
            return;
          }
          setTasks((prev) => {
            const idx = prev.findIndex((task) => task.id === mapped.id);
            if (idx === -1) return [...prev, mapped];
            const next = [...prev];
            next[idx] = {
              ...mapped,
              eventName: mapped.eventName ?? prev[idx]?.eventName ?? null,
            };
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, supabase]);

  return useMemo(
    () => ({
      tasks,
      loading,
      loadTasks: () => loadTasks({ silent: false }),
    }),
    [tasks, loading, loadTasks],
  );
}
