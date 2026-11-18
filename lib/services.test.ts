import { describe, expect, it } from "vitest";
import { isModuleVisibleForService } from "./services";

describe("isModuleVisibleForService", () => {
  it("laisse tout visible sans service actif", () => {
    expect(isModuleVisibleForService("events", null)).toBe(true);
    expect(isModuleVisibleForService("stock", null)).toBe(true);
    expect(isModuleVisibleForService("tableau", null)).toBe(true);
  });

  it("garde les modules Communication pour communication", () => {
    expect(isModuleVisibleForService("events", "communication")).toBe(true);
    expect(isModuleVisibleForService("stock", "communication")).toBe(true);
    expect(isModuleVisibleForService("medias", "communication")).toBe(true);
    expect(isModuleVisibleForService("idees", "communication")).toBe(true);
  });

  it("garde les modules transverses et réglages quel que soit le slug", () => {
    expect(isModuleVisibleForService("tableau", "communication")).toBe(true);
    expect(isModuleVisibleForService("livrables", "communication")).toBe(true);
    expect(isModuleVisibleForService("settings", "communication")).toBe(true);
    expect(isModuleVisibleForService(null, "communication")).toBe(true);
  });
});
