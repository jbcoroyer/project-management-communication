import { describe, expect, it } from "vitest";
import {
  completedAtPatchForColumnChange,
  completedAtIsoForNewTaskInColumn,
} from "./completedAt";
import { DONE_COLUMN_NAME } from "./workflowConstants";

describe("completedAtPatchForColumnChange", () => {
  it("retourne un horodatage ISO en entrant dans 'Terminé'", () => {
    const patch = completedAtPatchForColumnChange("En cours", DONE_COLUMN_NAME);
    expect(patch).toHaveProperty("completed_at");
    expect(typeof (patch as { completed_at: string }).completed_at).toBe("string");
    expect(() =>
      new Date((patch as { completed_at: string }).completed_at).toISOString(),
    ).not.toThrow();
  });

  it("retourne completed_at: null en sortant de 'Terminé'", () => {
    const patch = completedAtPatchForColumnChange(DONE_COLUMN_NAME, "En cours");
    expect(patch).toEqual({ completed_at: null });
  });

  it("retourne un patch vide en restant dans 'Terminé'", () => {
    const patch = completedAtPatchForColumnChange(DONE_COLUMN_NAME, DONE_COLUMN_NAME);
    expect(patch).toEqual({});
  });

  it("retourne un patch vide en restant hors de 'Terminé'", () => {
    const patch = completedAtPatchForColumnChange("À faire", "En cours");
    expect(patch).toEqual({});
  });
});

describe("completedAtIsoForNewTaskInColumn", () => {
  it("retourne null pour une nouvelle tâche hors 'Terminé'", () => {
    expect(completedAtIsoForNewTaskInColumn("À faire")).toBeNull();
    expect(completedAtIsoForNewTaskInColumn("En cours")).toBeNull();
  });

  it("retourne un ISO valide pour une nouvelle tâche dans 'Terminé'", () => {
    const value = completedAtIsoForNewTaskInColumn(DONE_COLUMN_NAME);
    expect(value).not.toBeNull();
    expect(() => new Date(value as string).toISOString()).not.toThrow();
  });
});
