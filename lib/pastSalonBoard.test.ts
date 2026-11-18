import { describe, expect, it } from "vitest";
import {
  filterOutPastSalonTasks,
  isEndDatePast,
  isPastLinkedBoardTask,
  todayIsoDate,
} from "./pastSalonBoard";

describe("isEndDatePast", () => {
  it("détecte une date strictement avant aujourd’hui", () => {
    expect(isEndDatePast("2026-03-12", "2026-11-18")).toBe(true);
    expect(isEndDatePast("2026-11-18", "2026-11-18")).toBe(false);
    expect(isEndDatePast("2026-11-19", "2026-11-18")).toBe(false);
    expect(isEndDatePast(null, "2026-11-18")).toBe(false);
    expect(isEndDatePast("bad", "2026-11-18")).toBe(false);
  });
});

describe("isPastLinkedBoardTask", () => {
  const today = "2026-11-18";

  it("marque un salon passé par endDate", () => {
    expect(
      isPastLinkedBoardTask(
        { salonId: "s1", salonEndDate: "2026-03-12" },
        today,
      ),
    ).toBe(true);
  });

  it("marque statut termine", () => {
    expect(
      isPastLinkedBoardTask(
        { salonId: "s1", salonEndDate: "2027-01-01", salonStatus: "termine" },
        today,
      ),
    ).toBe(true);
  });

  it("ignore les archivées et sous-tâches", () => {
    expect(
      isPastLinkedBoardTask(
        { salonId: "s1", salonEndDate: "2026-01-01", isArchived: true },
        today,
      ),
    ).toBe(false);
    expect(
      isPastLinkedBoardTask(
        { salonId: "s1", salonEndDate: "2026-01-01", parentTaskId: "p" },
        today,
      ),
    ).toBe(false);
  });

  it("garde un salon futur", () => {
    expect(
      isPastLinkedBoardTask(
        { salonId: "s1", salonEndDate: "2026-12-01" },
        today,
      ),
    ).toBe(false);
  });
});

describe("filterOutPastSalonTasks", () => {
  it("retire CAHE / EuroTier passés du board", () => {
    const today = "2026-11-18";
    const tasks = [
      { id: "1", salonId: "cahe", salonEndDate: "2026-03-12", projectName: "A" },
      { id: "2", salonId: "space", salonEndDate: "2026-12-01", projectName: "B" },
      { id: "3", projectName: "standalone" },
    ];
    const kept = filterOutPastSalonTasks(tasks, today);
    expect(kept.map((t) => t.id)).toEqual(["2", "3"]);
  });
});

describe("todayIsoDate", () => {
  it("formate YYYY-MM-DD", () => {
    expect(todayIsoDate(new Date("2026-11-18T15:30:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
