import { describe, expect, it } from "vitest";
import {
  DEFAULT_ORG_LABELS,
  parseOrgLabels,
  resolveOrgLabel,
} from "./orgLabels";

describe("orgLabels", () => {
  it("parse les libellés valides uniquement", () => {
    expect(
      parseOrgLabels({ domain: "  Famille  ", company: "", unknown: "x", task: 12 }),
    ).toEqual({ domain: "Famille" });
  });

  it("résout le défaut si custom absent", () => {
    expect(resolveOrgLabel({}, "task")).toBe(DEFAULT_ORG_LABELS.task);
    expect(resolveOrgLabel({ task: "Demande" }, "task")).toBe("Demande");
  });
});
