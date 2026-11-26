import { describe, expect, it, vi } from "vitest";
import {
  mirrorChecklistDeleteOntoTasks,
  mirrorChecklistItemOntoTasks,
} from "./salonBoardMirror";
import type { Task } from "./types";

function baseTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    projectName: "Ancien libellé",
    company: "IDENA",
    domain: "Event",
    admins: ["Jean-Baptiste COROYER"],
    isClientRequest: false,
    clientName: "",
    requestDate: "",
    deadline: "2026-01-01",
    budget: "",
    description: "",
    column: "À faire",
    priority: "Moyenne",
    projectedWork: [],
    elapsedMs: 0,
    isRunning: false,
    isArchived: false,
    estimatedHours: 0,
    estimatedDays: 0,
    ...overrides,
  };
}

describe("salonBoardMirror", () => {
  it("met à jour assignee / label / deadline / done sur la tâche liée", () => {
    const setTasks = vi.fn((updater: (prev: Task[]) => Task[]) => {
      const next = updater([baseTask(), baseTask({ id: "other" })]);
      expect(next[0]?.admins).toEqual(["Alexandre Allorent"]);
      expect(next[0]?.projectName).toBe("Artwork / visuels");
      expect(next[0]?.deadline).toBe("2026-12-17");
      expect(next[0]?.column).toBe("Terminé");
      expect(next[1]?.admins).toEqual(["Jean-Baptiste COROYER"]);
    });
    mirrorChecklistItemOntoTasks(setTasks, {
      taskId: "task-1",
      label: "Artwork / visuels",
      dueDate: "2026-12-17",
      done: true,
      assignee: "Alexandre Allorent",
    });
    expect(setTasks).toHaveBeenCalledOnce();
  });

  it("no-op sans taskId", () => {
    const setTasks = vi.fn();
    mirrorChecklistItemOntoTasks(setTasks, {
      taskId: null,
      label: "x",
      dueDate: null,
      done: false,
      assignee: "Alexandre Allorent",
    });
    expect(setTasks).not.toHaveBeenCalled();
  });

  it("archive la tâche liée à la suppression", () => {
    const setTasks = vi.fn((updater: (prev: Task[]) => Task[]) => {
      const next = updater([baseTask()]);
      expect(next[0]?.isArchived).toBe(true);
    });
    mirrorChecklistDeleteOntoTasks(setTasks, "task-1");
    expect(setTasks).toHaveBeenCalledOnce();
  });
});
