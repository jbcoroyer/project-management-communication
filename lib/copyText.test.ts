import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./toast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

import { copyText } from "./copyText";
import { toastError, toastSuccess } from "./toast";

describe("copyText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("copie le texte et toast success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    await expect(copyText("  Hello  ", "Titre copié")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("Hello");
    expect(toastSuccess).toHaveBeenCalledWith("Titre copié");
    expect(toastError).not.toHaveBeenCalled();
  });

  it("refuse une chaîne vide", async () => {
    const writeText = vi.fn();
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    await expect(copyText("   ")).resolves.toBe(false);
    expect(writeText).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalled();
  });

  it("signale une erreur presse-papiers", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });

    await expect(copyText("x")).resolves.toBe(false);
    expect(toastError).toHaveBeenCalledWith("Copie impossible.");
  });
});
