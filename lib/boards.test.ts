import { describe, expect, it } from "vitest";
import {
  defaultBoardCapabilities,
  parseBoardCapabilities,
  slugifyBoardName,
} from "./boards";

describe("boards helpers", () => {
  it("force columns à true", () => {
    expect(parseBoardCapabilities({ columns: false, calendar: true }).columns).toBe(true);
    expect(parseBoardCapabilities({ calendar: true }).calendar).toBe(true);
  });

  it("fournit des capacités par défaut", () => {
    const caps = defaultBoardCapabilities();
    expect(caps.columns).toBe(true);
    expect(caps.custom_fields).toBe(false);
  });

  it("slugifie un nom", () => {
    expect(slugifyBoardName("Devis ADV 2026!")).toBe("devis-adv-2026");
  });
});
