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
import { useCurrentUser } from "./currentUserContext";
import { getSupabaseBrowser } from "./supabaseBrowser";
import { markTaskMutatedLocally } from "./taskMutatedLocally";
import { mapTaskRow } from "./taskMappers";
import { TASK_SELECT_WITH_EVENT } from "./taskQueries";
import type { Task } from "./types";

type TasksContextValue = {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  loading: boolean;
  loadTasks: () => Promise<void>;
  optimisticUpdate: (
    taskId: string,
    nextTask: Task,
    patch: Record<string, unknown>,
  ) => Promise<boolean>;
};

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const mutationSeq = useRef(0);
  const tasksRef = useRef<Task[]>([]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const loadTasks = useCallback(async () => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tasks")
        .select(TASK_SELECT_WITH_EVENT)
        .order("created_at", { ascending: true })
        .limit(1000);
      if (error) throw error;
      setTasks((data ?? []).map(mapTaskRow));
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }
    void loadTasks().catch(() => setTasks([]));
  }, [loadTasks, user]);

  useEffect(() => {
    if (!user) return;

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
  }, [supabase, user]);

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

  const value = useMemo(
    () => ({
      tasks,
      setTasks,
      loading,
      loadTasks,
      optimisticUpdate,
    }),
    [tasks, loading, loadTasks, optimisticUpdate],
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext);
  if (!ctx) {
    throw new Error("useTasks doit être utilisé sous TasksProvider.");
  }
  return ctx;
}
