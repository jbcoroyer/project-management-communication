import { describe, expect, it } from "vitest";
import { collectFolderTaskIds, folderTaskIdsNeedingMove } from "./folderBulkMove";
import type { Task } from "./types";

function task(over: Partial<Task> & { id: string }): Task {
  return {
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
    column: "À faire",
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

describe("folderBulkMove", () => {
  const tasks = [
    task({ id: "a", salonId: "cahe", column: "À faire" }),
    task({ id: "b", salonId: "cahe", column: "En cours" }),
    task({ id: "c", salonId: "cahe", column: "Terminé" }),
    task({ id: "d", salonId: "euro", column: "À faire" }),
    task({ id: "e", salonId: "cahe", column: "À faire", isArchived: true }),
    task({ id: "f", eventId: "ev1", column: "En cours" }),
  ];

  it("collecte toutes les tâches actives du salon", () => {
    expect(collectFolderTaskIds(tasks, { kind: "salon", salonId: "cahe" }).sort()).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("ne déplace que celles hors colonne cible (ex. Terminé)", () => {
    expect(
      folderTaskIdsNeedingMove(tasks, { kind: "salon", salonId: "cahe" }, "Terminé").sort(),
    ).toEqual(["a", "b"]);
  });

  it("supporte les dossiers event", () => {
    expect(folderTaskIdsNeedingMove(tasks, { kind: "event", eventId: "ev1" }, "Terminé")).toEqual([
      "f",
    ]);
  });
});
