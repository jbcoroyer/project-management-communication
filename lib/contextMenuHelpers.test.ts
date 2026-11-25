import { describe, expect, it } from "vitest";
import {
  ARCHIVE_CONTEXT_ACTIONS,
  archiveContextActionLabel,
  clampMenuPosition,
  FOLDER_CONTEXT_ACTIONS,
  folderContextActionLabel,
  moveTargetColumns,
  SALON_CARD_CONTEXT_ACTIONS,
  SALON_LOGO_CONTEXT_ACTIONS,
  salonCardContextActionLabel,
  salonLogoContextActionLabel,
  TASK_CONTEXT_ACTIONS,
  taskContextActionLabel,
} from "./contextMenuHelpers";

describe("contextMenuHelpers", () => {
  it("couvre les actions tâche attendues (board / liste / todo)", () => {
    expect([...TASK_CONTEXT_ACTIONS]).toEqual([
      "open",
      "edit",
      "copy-title",
      "move",
      "archive",
      "delete",
    ]);
    expect(taskContextActionLabel("archive")).toBe("Archiver");
    expect(taskContextActionLabel("copy-title")).toBe("Copier le titre");
  });

  it("couvre dossiers board, cartes salon et archives", () => {
    expect(FOLDER_CONTEXT_ACTIONS).toContain("move-all");
    expect(FOLDER_CONTEXT_ACTIONS).toContain("open-salon");
    expect(SALON_CARD_CONTEXT_ACTIONS).toEqual([
      "open",
      "rename",
      "copy-name",
      "clone",
      "mark-done",
      "delete",
    ]);
    expect(ARCHIVE_CONTEXT_ACTIONS).toEqual(["restore", "copy-title", "delete"]);
  });

  it("exclut la colonne courante des cibles de déplacement", () => {
    expect(moveTargetColumns(["À faire", "En cours", "Terminé"], "En cours")).toEqual([
      "À faire",
      "Terminé",
    ]);
    expect(moveTargetColumns(["À faire"], "À faire")).toEqual([]);
  });

  it("clamp la position du menu dans le viewport", () => {
    expect(
      clampMenuPosition(10, 20, { width: 1000, height: 800 }, { width: 184, height: 220 }),
    ).toEqual({ x: 10, y: 20 });

    expect(
      clampMenuPosition(990, 790, { width: 1000, height: 800 }, { width: 184, height: 220 }),
    ).toEqual({ x: 1000 - 184 - 8, y: 800 - 220 - 8 });

    expect(
      clampMenuPosition(-40, -10, { width: 400, height: 300 }, { width: 184, height: 220 }),
    ).toEqual({ x: 8, y: 8 });
  });

  it("couvre le menu logo salon (TUE-37)", () => {
    expect([...SALON_LOGO_CONTEXT_ACTIONS]).toEqual(["change", "reset"]);
    expect(salonLogoContextActionLabel("change")).toBe("Changer le logo…");
    expect(salonLogoContextActionLabel("reset")).toBe("Logo catalogue");
  });

  it("libellés FR stables cartes salon / dossiers / archives", () => {
    expect(salonCardContextActionLabel("rename")).toBe("Renommer…");
    expect(salonCardContextActionLabel("clone")).toBe("Cloner…");
    expect(salonCardContextActionLabel("mark-done")).toBe("Marquer terminé");
    expect(folderContextActionLabel("open-salon")).toBe("Ouvrir le salon");
    expect(folderContextActionLabel("move-all")).toBe("Tout déplacer vers");
    expect(archiveContextActionLabel("restore")).toBe("Restaurer");
    expect(archiveContextActionLabel("delete")).toBe("Supprimer");
  });
});
