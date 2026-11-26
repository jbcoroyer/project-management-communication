import type { Dispatch, SetStateAction } from "react";
import { markTaskMutatedLocally } from "./taskMutatedLocally";
import { primaryAssignee } from "./salonAssignees";
import type { SalonChecklistItem } from "./salonTypes";
import type { AdminId, Task } from "./types";

/** Applique une case checklist sur la tâche board déjà en mémoire (sans recharger). */
export function mirrorChecklistItemOntoTasks(
  setTasks: Dispatch<SetStateAction<Task[]>>,
  item: Pick<SalonChecklistItem, "taskId" | "label" | "dueDate" | "done" | "assignees">,
): void {
  if (!item.taskId) return;
  markTaskMutatedLocally(item.taskId);
  const names = item.assignees.map((n) => n.trim()).filter(Boolean);
  const admins: AdminId[] =
    names.length > 0 ? (names as AdminId[]) : (["Équipe"] as AdminId[]);
  setTasks((prev) =>
    prev.map((task) => {
      if (task.id !== item.taskId) return task;
      return {
        ...task,
        projectName: item.label,
        deadline: item.dueDate ?? "",
        column: item.done ? "Terminé" : "À faire",
        completedAt: item.done ? task.completedAt ?? new Date().toISOString() : undefined,
        admins,
      };
    }),
  );
}

/** Archive / retire une tâche board liée après suppression d’une case. */
export function mirrorChecklistDeleteOntoTasks(
  setTasks: Dispatch<SetStateAction<Task[]>>,
  taskId: string | null | undefined,
): void {
  if (!taskId) return;
  markTaskMutatedLocally(taskId);
  setTasks((prev) =>
    prev.map((task) => (task.id === taskId ? { ...task, isArchived: true } : task)),
  );
}

export { primaryAssignee };
