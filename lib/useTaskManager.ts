"use client";

import { useCallback, useEffect } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { completedAtPatchForColumnChange, completedAtIsoForNewTaskInColumn } from "./completedAt";
import { mapTaskRow } from "./taskMappers";
import { normalizeProjectName } from "./normalize";
import { celebrateTaskDone } from "./celebrateTaskDone";
import { markTaskMutatedLocally, markTasksMutatedLocally } from "./taskMutatedLocally";
import { toastError, toastSuccess } from "./toast";
import { DONE_COLUMN_NAME } from "./workflowConstants";
import type { ColumnId, Task } from "./types";
import type { TaskFormValuesWithSubtasks } from "./validation/taskSchema";

const AUTO_ARCHIVE_DELAY_MS = 24 * 60 * 60 * 1000;

function normalizeProjectedWorkForSave(
  items: Array<{ date: string; hours: number; startTime?: string; endTime?: string }>,
) {
  return (items ?? [])
    .filter((item) => item?.date)
    .map((item) => {
      let hours = Number(item.hours) || 0;
      if (item.startTime && item.endTime) {
        const [sh, sm] = item.startTime.split(":").map(Number);
        const [eh, em] = item.endTime.split(":").map(Number);
        const diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
        if (Number.isFinite(diffMinutes) && diffMinutes > 0) {
          hours = diffMinutes / 60;
        }
      }
      return {
        date: item.date,
        startTime: item.startTime || undefined,
        endTime: item.endTime || undefined,
        hours,
      };
    })
    .filter((item) => item.hours > 0);
}

type UseTaskManagerParams = {
  supabase: SupabaseClient;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  optimisticUpdate: (
    taskId: string,
    nextTask: Task,
    dbPatch: Record<string, unknown>,
  ) => Promise<unknown>;
  columns: string[];
  newTaskColumn: ColumnId;
  editingTaskId: string | null;
  onTaskFormDone: () => void;
};

export function useTaskManager({
  supabase,
  tasks,
  setTasks,
  optimisticUpdate,
  columns,
  newTaskColumn,
  editingTaskId,
  onTaskFormDone,
}: UseTaskManagerParams) {
  useEffect(() => {
    const toArchive = tasks.filter((t) => {
      if (t.column !== DONE_COLUMN_NAME || t.isArchived || t.parentTaskId) return false;
      const doneMs = t.completedAt ? new Date(t.completedAt).getTime() : 0;
      return doneMs > 0 && Date.now() - doneMs > AUTO_ARCHIVE_DELAY_MS;
    });
    if (toArchive.length === 0) return;
    for (const task of toArchive) {
      void optimisticUpdate(task.id, { ...task, isArchived: true }, { is_archived: true });
    }
  }, [tasks, optimisticUpdate]);

  const handleCreateTask = useCallback(
    async (values: TaskFormValuesWithSubtasks) => {
      const selectedAdmins = values.admins;
      const normalizedProjectedWork = normalizeProjectedWorkForSave(values.projectedWork ?? []);
      const basePayload = {
        project_name: normalizeProjectName(values.projectName),
        company: values.company,
        domain: values.domain,
        admin: selectedAdmins.join(","),
        is_client_request: values.isClientRequest,
        client_name: values.clientName.trim(),
        deadline: values.deadline || null,
        budget: values.budget.trim(),
        description: values.description.trim(),
        priority: values.priority,
        projected_work: normalizedProjectedWork,
        estimated_hours: parseFloat(values.estimatedHours.replace(",", ".")) || 0,
        estimated_days: parseFloat(values.estimatedDays.replace(",", ".")) || 0,
      };

      if (editingTaskId) {
        const { data, error } = await supabase
          .from("tasks")
          .update(basePayload)
          .eq("id", editingTaskId)
          .select()
          .single();
        if (error) {
          toastError("Impossible de mettre à jour la tâche. Veuillez réessayer.");
          return;
        }
        if (!data) return;
        markTaskMutatedLocally(editingTaskId);
        setTasks((prev) => prev.map((task) => (task.id === editingTaskId ? mapTaskRow(data) : task)));
        onTaskFormDone();
        return;
      }

      const payload = {
        ...basePayload,
        column_id: newTaskColumn,
        lane: selectedAdmins[0],
        elapsed_ms: 0,
        is_running: false,
        last_start_time_ms: null,
        is_archived: false,
        completed_at: completedAtIsoForNewTaskInColumn(newTaskColumn),
      };
      const { data, error } = await supabase.from("tasks").insert(payload).select().single();
      if (error) {
        toastError(`Impossible de créer la tâche : ${error.message}`);
        console.error("Erreur création tâche Supabase", error);
        return;
      }
      if (!data) return;
      markTaskMutatedLocally(data.id as string);
      const newTask = mapTaskRow(data);
      setTasks((prev) => [...prev, newTask]);

      if (values.subtasks && values.subtasks.length > 0) {
        const firstColumn = columns[0] ?? "À faire";
        const subtaskRows = values.subtasks.map((sub) => ({
          project_name: sub.name,
          company: values.company,
          domain: values.domain,
          admin: sub.adminName,
          lane: sub.adminName,
          deadline: sub.deadline || null,
          column_id: firstColumn,
          priority: "Moyenne" as const,
          is_archived: false,
          is_client_request: false,
          parent_task_id: newTask.id,
          estimated_hours: 0,
          estimated_days: 0,
          elapsed_ms: 0,
          is_running: false,
        }));
        const { data: subData, error: subError } = await supabase.from("tasks").insert(subtaskRows).select();
        if (subError) {
          toastError(`Sous-tâches non créées : ${subError.message}`);
        } else if (subData) {
          markTasksMutatedLocally(subData.map((r) => (r as { id: string }).id).filter(Boolean));
          setTasks((prev) => [...prev, ...subData.map(mapTaskRow)]);
        }
      }

      onTaskFormDone();
    },
    [columns, editingTaskId, newTaskColumn, onTaskFormDone, setTasks, supabase],
  );

  const handleArchiveTask = useCallback(
    (taskId: string) => {
      if (typeof window !== "undefined") {
        const confirmed = window.confirm(
          "Archiver cette tâche ? Elle restera disponible dans l'onglet Archives.",
        );
        if (!confirmed) return;
      }
      const current = tasks.find((task) => task.id === taskId);
      if (!current) return;
      void optimisticUpdate(taskId, { ...current, isArchived: true }, { is_archived: true })
        .then(() => toastSuccess("Tâche archivée"))
        .catch(() => toastError("Impossible d'archiver la tâche. Veuillez réessayer."));
    },
    [optimisticUpdate, tasks],
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      if (typeof window !== "undefined") {
        const confirmed = window.confirm("Supprimer définitivement cette tâche ?");
        if (!confirmed) return;
      }
      const previous = tasks;
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      const { data, error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId)
        .select("id")
        .maybeSingle();
      if (error || !data) {
        setTasks(previous);
        const reason = error?.message
          ? `Suppression refusée: ${error.message}`
          : "Suppression refusée: aucune ligne supprimée (RLS ou id introuvable).";
        toastError(reason);
        return;
      }
      toastSuccess("Tâche supprimée");
    },
    [setTasks, supabase, tasks],
  );

  const handlePermanentDelete = useCallback(
    async (taskId: string) => {
      if (typeof window !== "undefined") {
        const confirmed = window.confirm(
          "Supprimer définitivement cette tâche ? Cette action est irréversible.",
        );
        if (!confirmed) return;
      }
      const previous = tasks;
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) {
        setTasks(previous);
        toastError(`Suppression impossible : ${error.message}`);
        return;
      }
      toastSuccess("Tâche supprimée définitivement.");
    },
    [setTasks, supabase, tasks],
  );

  const handleInlineSave = useCallback(
    async (taskId: string, patch: Partial<Task>, dbPatch: Record<string, unknown>) => {
      const current = tasks.find((t) => t.id === taskId);
      if (!current) return;
      markTaskMutatedLocally(taskId);
      const next = { ...current, ...patch };
      const movingToDone =
        patch.column === DONE_COLUMN_NAME && current.column !== DONE_COLUMN_NAME;
      setTasks((prev) => prev.map((t) => (t.id === taskId ? next : t)));
      const { error } = await supabase.from("tasks").update(dbPatch).eq("id", taskId);
      if (error) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? current : t)));
        toastError("Impossible de sauvegarder les modifications.");
        return;
      }
      if (movingToDone) celebrateTaskDone();
      toastSuccess("Tâche mise à jour.");
    },
    [setTasks, supabase, tasks],
  );

  const handleRestoreTask = useCallback(
    async (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      markTaskMutatedLocally(taskId);
      const restorePatch: Record<string, unknown> = { is_archived: false };
      if (task?.column === DONE_COLUMN_NAME) {
        restorePatch.completed_at = new Date().toISOString();
      }
      const { error } = await supabase.from("tasks").update(restorePatch).eq("id", taskId);
      if (error) {
        toastError("Impossible de restaurer la tâche.");
        return;
      }
      const resetAt =
        task?.column === DONE_COLUMN_NAME ? (restorePatch.completed_at as string) : task?.completedAt;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, isArchived: false, completedAt: resetAt ?? t.completedAt }
            : t,
        ),
      );
      toastSuccess("Tâche restaurée");
    },
    [setTasks, supabase, tasks],
  );

  const handleMoveTask = useCallback(
    (taskId: string, newColumn: ColumnId) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.column === newColumn) return;
      const colMerge = completedAtPatchForColumnChange(task.column, newColumn);
      const dbPatch: Record<string, unknown> = { column_id: newColumn, ...colMerge };
      const nextCompletedAt =
        "completed_at" in colMerge
          ? colMerge.completed_at === null
            ? undefined
            : colMerge.completed_at
          : task.completedAt;
      const completedNow = newColumn === DONE_COLUMN_NAME && task.column !== DONE_COLUMN_NAME;
      void optimisticUpdate(
        taskId,
        { ...task, column: newColumn, completedAt: nextCompletedAt },
        dbPatch,
      )
        .then(() => {
          if (completedNow) celebrateTaskDone();
        })
        .catch(() => toastError("Impossible de déplacer la tâche. Veuillez réessayer."));
    },
    [optimisticUpdate, tasks],
  );

  return {
    handleCreateTask,
    handleArchiveTask,
    handleDeleteTask,
    handlePermanentDelete,
    handleInlineSave,
    handleRestoreTask,
    handleMoveTask,
  };
}
