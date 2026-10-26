import { describe, expect, it } from "vitest";
import { filterAndRankHits, scoreHit, type GlobalSearchHit } from "./globalSearch";

const hits: GlobalSearchHit[] = [
  {
    id: "1",
    kind: "task",
    title: "Brochure SPACE",
    subtitle: "IDENA",
    href: "/v3/dashboard/kanban?task=1",
  },
  {
    id: "2",
    kind: "deliverable",
    title: "Flyer salon",
    subtitle: "IDENA",
    href: "/v3/deliverables",
  },
  {
    id: "3",
    kind: "event",
    title: "SPACE 2026",
    subtitle: "Rennes",
    href: "/v3/events/3",
  },
];

describe("scoreHit", () => {
  it("priorise le titre exact", () => {
    expect(scoreHit("SPACE 2026", "Rennes", "SPACE 2026")).toBeGreaterThan(
      scoreHit("Brochure SPACE", "IDENA", "SPACE"),
    );
  });
});

describe("filterAndRankHits", () => {
  it("filtre et trie", () => {
    const result = filterAndRankHits(hits, "space");
    expect(result.map((h) => h.id)).toEqual(["3", "1"]);
  });

  it("retourne vide si trop court / aucun match", () => {
    expect(filterAndRankHits(hits, "zzz")).toEqual([]);
  });
});
