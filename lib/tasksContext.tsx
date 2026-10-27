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
import { AUTO_ARCHIVE_DELAY_MS, DONE_COLUMN_NAME } from "./workflowConstants";
import type { Task } from "./types";
import { useWorkspace } from "./workspaceContext";

type TasksContextValue = {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  loading: boolean;
  /** true une fois les tâches archivées fusionnées (ou en cours). */
  archivedLoaded: boolean;
  loadTasks: () => Promise<void>;
  /** Charge les archivées à la demande (onglets Archives / Analytics). */
  ensureArchivedLoaded: () => Promise<void>;
  optimisticUpdate: (
    taskId: string,
    nextTask: Task,
    patch: Record<string, unknown>,
  ) => Promise<boolean>;
};

const TasksContext = createContext<TasksContextValue | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const { workspaceId, loading: workspaceLoading } = useWorkspace();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [tasks, setTasks] = useState<Task[]>([]);
  /** true jusqu’au premier cycle de chargement (splash + états vides). */
  const [loading, setLoading] = useState(true);
  const [archivedLoaded, setArchivedLoaded] = useState(false);
  const archivedLoadingRef = useRef(false);
  const mutationSeq = useRef(0);
  const tasksRef = useRef<Task[]>([]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  const loadTasks = useCallback(async () => {
    if (!user || !workspaceId) {
      setTasks([]);
      setLoading(false);
      setArchivedLoaded(false);
      return;
    }
    try {
      // Actives seulement — les archivées via ensureArchivedLoaded.
      const { data, error } = await supabase
        .from("tasks")
        .select(TASK_SELECT_WITH_EVENT)
        .eq("organization_id", workspaceId)
        .eq("is_archived", false)
        .order("created_at", { ascending: true })
        .limit(1000);
      if (error) throw error;
      const active = (data ?? []).map(mapTaskRow);
      setTasks((prev) => {
        if (!archivedLoaded) return active;
        const archived = prev.filter((t) => t.isArchived);
        return [...active, ...archived];
      });
    } finally {
      setLoading(false);
    }
  }, [archivedLoaded, supabase, user, workspaceId]);

  const ensureArchivedLoaded = useCallback(async () => {
    if (!user || !workspaceId || archivedLoaded || archivedLoadingRef.current) return;
    archivedLoadingRef.current = true;
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(TASK_SELECT_WITH_EVENT)
        .eq("organization_id", workspaceId)
        .eq("is_archived", true)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const archived = (data ?? []).map(mapTaskRow);
      setTasks((prev) => {
        const active = prev.filter((t) => !t.isArchived);
        const byId = new Map(active.map((t) => [t.id, t]));
        for (const t of archived) byId.set(t.id, t);
        return Array.from(byId.values());
      });
      setArchivedLoaded(true);
    } catch {
      // Best-effort : l’onglet Archives restera vide plutôt que de bloquer.
    } finally {
      archivedLoadingRef.current = false;
    }
  }, [archivedLoaded, supabase, user, workspaceId]);

  useEffect(() => {
    if (!user || workspaceLoading) {
      if (!user) {
        setTasks([]);
        setLoading(false);
        setArchivedLoaded(false);
      }
      return;
    }
    if (!workspaceId) {
      setTasks([]);
      setLoading(false);
      setArchivedLoaded(false);
      return;
    }
    setArchivedLoaded(false);
    setLoading(true);
    void loadTasks().catch(() => {
      setTasks([]);
      setLoading(false);
    });
  }, [user, workspaceId, workspaceLoading]); // eslint-disable-line react-hooks/exhaustive-deps -- reload on auth/workspace

  useEffect(() => {
    if (!user || !workspaceId) return;

    const channel = supabase
      .channel(`tasks-ws-${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `organization_id=eq.${workspaceId}`,
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
          // Ignorer les nouvelles archivées tant qu’on n’a pas ouvert Archives.
          if (mapped.isArchived && !archivedLoaded) {
            setTasks((prev) => prev.filter((task) => task.id !== mapped.id));
            return;
          }
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
  }, [archivedLoaded, supabase, user, workspaceId]);

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

  // Tâches « Terminé » depuis +2 jours → archives (kanban + événementiel).
  useEffect(() => {
    if (!user || loading) return;
    const toArchive = tasks.filter((t) => {
      if (t.column !== DONE_COLUMN_NAME || t.isArchived || t.parentTaskId) return false;
      const doneMs = t.completedAt ? new Date(t.completedAt).getTime() : 0;
      return doneMs > 0 && Date.now() - doneMs > AUTO_ARCHIVE_DELAY_MS;
    });
    if (toArchive.length === 0) return;
    for (const task of toArchive) {
      void optimisticUpdate(task.id, { ...task, isArchived: true }, { is_archived: true }).catch(
        () => {},
      );
    }
  }, [user, loading, tasks, optimisticUpdate]);

  const value = useMemo(
    () => ({
      tasks,
      setTasks,
      loading,
      archivedLoaded,
      loadTasks,
      ensureArchivedLoaded,
      optimisticUpdate,
    }),
    [tasks, loading, archivedLoaded, loadTasks, ensureArchivedLoaded, optimisticUpdate],
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
