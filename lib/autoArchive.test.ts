import { describe, expect, it } from "vitest";
import {
  autoArchiveCompletedBeforeIso,
  isDoneTaskReadyToArchive,
  selectTasksReadyToAutoArchive,
} from "./autoArchive";
import type { Task } from "./types";
import { AUTO_ARCHIVE_DELAY_MS } from "./workflowConstants";

function baseTask(over: Partial<Task> = {}): Task {
  return {
    id: "t1",
    projectName: "X",
    company: "IDENA",
    domain: "Event",
    admins: [],
    isClientRequest: false,
    clientName: "",
    requestDate: "",
    deadline: "",
    budget: "",
    description: "",
    column: "Terminé",
    priority: "Moyenne",
    projectedWork: [],
    elapsedMs: 0,
    isRunning: false,
    isArchived: false,
    estimatedHours: 0,
    estimatedDays: 0,
    ...over,
  };
}

describe("isDoneTaskReadyToArchive", () => {
  const now = Date.parse("2026-11-18T12:00:00.000Z");

  it("archive après 24 h avec completedAt", () => {
    const old = new Date(now - AUTO_ARCHIVE_DELAY_MS - 1000).toISOString();
    expect(
      isDoneTaskReadyToArchive(baseTask({ completedAt: old }), now),
    ).toBe(true);
  });

  it("ne archive pas avant 24 h", () => {
    const recent = new Date(now - AUTO_ARCHIVE_DELAY_MS + 60_000).toISOString();
    expect(
      isDoneTaskReadyToArchive(baseTask({ completedAt: recent }), now),
    ).toBe(false);
  });

  it("archive immédiatement si completedAt manquant (legacy)", () => {
    expect(isDoneTaskReadyToArchive(baseTask({ completedAt: undefined }), now)).toBe(
      true,
    );
  });

  it("ignore hors Terminé / archivées / sous-tâches", () => {
    expect(
      isDoneTaskReadyToArchive(baseTask({ column: "À faire", completedAt: undefined }), now),
    ).toBe(false);
    expect(
      isDoneTaskReadyToArchive(baseTask({ isArchived: true, completedAt: undefined }), now),
    ).toBe(false);
    expect(
      isDoneTaskReadyToArchive(
        baseTask({ parentTaskId: "p", completedAt: undefined }),
        now,
      ),
    ).toBe(false);
  });
});

describe("selectTasksReadyToAutoArchive", () => {
  it("filtre la liste", () => {
    const now = Date.parse("2026-11-18T12:00:00.000Z");
    const ready = baseTask({ id: "a", completedAt: undefined });
    const keep = baseTask({
      id: "b",
      completedAt: new Date(now - 1000).toISOString(),
    });
    expect(selectTasksReadyToAutoArchive([ready, keep], now).map((t) => t.id)).toEqual([
      "a",
    ]);
  });
});

describe("autoArchiveCompletedBeforeIso", () => {
  it("retourne un ISO antérieur au délai", () => {
    const now = Date.parse("2026-11-18T12:00:00.000Z");
    const iso = autoArchiveCompletedBeforeIso(now, 24 * 60 * 60 * 1000);
    expect(iso).toBe("2026-11-17T12:00:00.000Z");
  });
});
