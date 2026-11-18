import { describe, expect, it } from "vitest";
import {
  GLOBAL_TASK_BOARD_SECTION,
  isMetierRoute,
  isMetierSpaceSlug,
  METIER_SPACE_META,
  METIER_SPACE_SLUGS,
  metierNavForSlug,
} from "./metierSpaces";

describe("metierSpaces", () => {
  it("expose Communication, R&D et Gestion de Projet", () => {
    expect(METIER_SPACE_SLUGS).toEqual([
      "communication",
      "rd",
      "gestion-de-projet",
    ]);
    expect(METIER_SPACE_META.rd.homeHref).toBe("/v3/rd");
    expect(METIER_SPACE_META["gestion-de-projet"].homeHref).toBe("/v3/gdp");
    expect(METIER_SPACE_META.communication.homeHref).toBe("/v3/dashboard/kanban");
  });

  it("détecte les slugs métier", () => {
    expect(isMetierSpaceSlug("rd")).toBe(true);
    expect(isMetierSpaceSlug("gestion-de-projet")).toBe(true);
    expect(isMetierSpaceSlug("communication")).toBe(true);
    expect(isMetierSpaceSlug("adv")).toBe(false);
    expect(isMetierSpaceSlug(null)).toBe(false);
  });

  it("fournit une nav dédiée R&D / GdP, pas Communication", () => {
    expect(metierNavForSlug("rd")?.some((s) => s.items.some((i) => i.href === "/v3/rd/gates"))).toBe(
      true,
    );
    expect(
      metierNavForSlug("gestion-de-projet")?.some((s) =>
        s.items.some((i) => i.href === "/v3/gdp/risques"),
      ),
    ).toBe(true);
    expect(metierNavForSlug("communication")).toBeNull();
    expect(metierNavForSlug(null)).toBeNull();
  });

  it("expose le tableau des tâches global en tête de nav R&D et GdP", () => {
    const kanbanHref = GLOBAL_TASK_BOARD_SECTION.items[0]?.href;
    expect(kanbanHref).toBe("/v3/dashboard/kanban");

    for (const slug of ["rd", "gestion-de-projet"] as const) {
      const nav = metierNavForSlug(slug);
      expect(nav?.[0]?.id).toBe("global-tasks");
      expect(nav?.[0]?.items.some((i) => i.href === "/v3/dashboard/kanban")).toBe(true);
      expect(nav?.flatMap((s) => s.items).filter((i) => i.href === "/v3/dashboard/kanban")).toHaveLength(
        1,
      );
    }
  });

  it("détecte les routes métier", () => {
    expect(isMetierRoute("/v3/rd/projets")).toBe(true);
    expect(isMetierRoute("/v3/gdp")).toBe(true);
    expect(isMetierRoute("/v3/dashboard/kanban")).toBe(false);
    expect(isMetierRoute("/v3/ideas")).toBe(false);
  });
});
