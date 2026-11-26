import { describe, expect, it } from "vitest";
import { formatAssignees, parseAssignees, primaryAssignee } from "./salonAssignees";

describe("salonAssignees", () => {
  it("parse CSV avec espaces", () => {
    expect(parseAssignees("Alice , Bob,  ")).toEqual(["Alice", "Bob"]);
    expect(parseAssignees(null)).toEqual([]);
    expect(parseAssignees("")).toEqual([]);
  });

  it("format → CSV ou null", () => {
    expect(formatAssignees(["Alice", " Bob "])).toBe("Alice, Bob");
    expect(formatAssignees([])).toBeNull();
  });

  it("primaryAssignee", () => {
    expect(primaryAssignee(["Alexandre Allorent", "Jean-Baptiste"])).toBe(
      "Alexandre Allorent",
    );
    expect(primaryAssignee([])).toBe("Équipe");
  });
});
