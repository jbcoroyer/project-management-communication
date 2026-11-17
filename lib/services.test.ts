import { describe, expect, it } from "vitest";
import { isModuleVisibleForService } from "./services";

describe("isModuleVisibleForService", () => {
  it("laisse tout visible sans service actif", () => {
    expect(isModuleVisibleForService("events", null)).toBe(true);
    expect(isModuleVisibleForService("stock", null)).toBe(true);
    expect(isModuleVisibleForService("tableau", null)).toBe(true);
  });

  it("masque les modules Communication hors service communication", () => {
    expect(isModuleVisibleForService("events", "adv")).toBe(false);
    expect(isModuleVisibleForService("stock", "export")).toBe(false);
    expect(isModuleVisibleForService("medias", "rd")).toBe(false);
    expect(isModuleVisibleForService("idees", "adv")).toBe(false);
  });

  it("garde les modules Communication pour communication", () => {
    expect(isModuleVisibleForService("events", "communication")).toBe(true);
    expect(isModuleVisibleForService("stock", "communication")).toBe(true);
  });

  it("garde les modules transverses et réglages", () => {
    expect(isModuleVisibleForService("tableau", "adv")).toBe(true);
    expect(isModuleVisibleForService("livrables", "export")).toBe(true);
    expect(isModuleVisibleForService("settings", "rd")).toBe(true);
    expect(isModuleVisibleForService(null, "adv")).toBe(true);
  });
});
