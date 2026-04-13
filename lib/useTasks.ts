"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "./supabaseBrowser";
import { markTaskMutatedLocally } from "./taskMutatedLocally";
import { mapTaskRow } from "./taskMappers";
import { TASK_SELECT_WITH_EVENT } from "./taskQueries";
import type { Task } from "./types";

export function useTasks() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const mutationSeq = useRef(0);
  const tasksRef = useRef<Task[]>([]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tasks")
        .select(TASK_SELECT_WITH_EVENT)
        .order("created_at", { ascending: true })
        .limit(1000);
      if (error) {
        throw error;
      }
      setTasks((data ?? []).map(mapTaskRow));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("tasks-shared-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload: { eventType?: string; old?: { id?: string }; new?: unknown }) => {
          if (payload.eventType === "DELETE") {
            const deletedId = payload.old?.id as string | undefined;
            if (!deletedId) return;
            setTasks((prev) => prev.filter((task) => task.id !== deletedId));
            return;
          }
          if (!payload.new) return;
          const mapped = mapTaskRow(payload.new);
          setTasks((prev) => {
            const idx = prev.findIndex((task) => task.id === mapped.id);
            const prevTask = idx >= 0 ? prev[idx] : undefined;
            const merged: Task = {
              ...mapped,
              eventName: mapped.eventName ?? prevTask?.eventName ?? null,
            };
            if (idx === -1) return [...prev, merged];
            const next = [...prev];
            next[idx] = merged;
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const optimisticUpdate = useCallback(
    async (taskId: string, nextTask: Task, patch: Record<string, unknown>) => {
      const seq = ++mutationSeq.current;
      const previous = tasksRef.current.find((task) => task.id === taskId);
      if (!previous) return false;

      markTaskMutatedLocally(taskId);
      setTasks((prev) => prev.map((task) => (task.id === taskId ? nextTask : task)));

      const { error } = await supabase.from("tasks").update(patch).eq("id", taskId);
      if (error && seq === mutationSeq.current) {
        setTasks((prev) => prev.map((task) => (task.id === taskId ? previous : task)));
        throw error;
      }
      return true;
    },
    [supabase],
  );

  return {
    tasks,
    setTasks,
    loading,
    loadTasks,
    optimisticUpdate,
  };
}
