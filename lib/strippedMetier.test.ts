import { describe, expect, it } from "vitest";
import { isStrippedBoard, isStrippedServiceSlug } from "./strippedMetier";

describe("strippedMetier", () => {
  it("détecte les services hors Communication", () => {
    expect(isStrippedServiceSlug("adv")).toBe(true);
    expect(isStrippedServiceSlug("export")).toBe(true);
    expect(isStrippedServiceSlug("rd")).toBe(true);
    expect(isStrippedServiceSlug("gestion-de-projet")).toBe(true);
    expect(isStrippedServiceSlug("communication")).toBe(false);
    expect(isStrippedServiceSlug(null)).toBe(false);
  });

  it("masque les boards seed ADV / R&D / GdP", () => {
    expect(isStrippedBoard({ name: "Devis ADV", slug: "evis", serviceSlug: "adv" })).toBe(true);
    expect(isStrippedBoard({ name: "Travail R&D", slug: "travail-rd", serviceSlug: "rd" })).toBe(
      true,
    );
    expect(
      isStrippedBoard({ name: "Tâches projet", slug: "taches-gdp", serviceSlug: "gestion-de-projet" }),
    ).toBe(true);
    expect(isStrippedBoard({ name: "Tableau", slug: "tableau", serviceSlug: null })).toBe(false);
    expect(
      isStrippedBoard({ name: "Campagne print", slug: "campagne-print", serviceSlug: "communication" }),
    ).toBe(false);
  });
});
