import { describe, expect, it } from "vitest";
import {
  SALON_LOGO_MAX_BYTES,
  isSalonLogoFile,
  salonLogoFileError,
  salonLogoPathFromUrl,
} from "./salonLogoUpload";

function fakeFile(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(Math.min(size, 16))], { type });
  const file = new File([blob], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("salonLogoUpload", () => {
  it("accepte les images sous 2 Mo", () => {
    expect(salonLogoFileError(fakeFile("logo.png", "image/png", 1024))).toBeNull();
    expect(salonLogoFileError(fakeFile("mark.svg", "image/svg+xml", 512))).toBeNull();
    expect(isSalonLogoFile(fakeFile("x.webp", "image/webp", 10))).toBe(true);
  });

  it("refuse les formats hors scope et les fichiers > 2 Mo", () => {
    expect(salonLogoFileError(fakeFile("notes.pdf", "application/pdf", 100))).toMatch(
      /Formats acceptés/,
    );
    expect(
      salonLogoFileError(fakeFile("gros.png", "image/png", SALON_LOGO_MAX_BYTES + 1)),
    ).toMatch(/2 Mo/);
  });

  it("extrait le path depuis une URL publique", () => {
    expect(
      salonLogoPathFromUrl(
        "https://x.supabase.co/storage/v1/object/public/salon-logos/org/salon/a.png?v=1",
      ),
    ).toBe("org/salon/a.png");
    expect(salonLogoPathFromUrl("/salons/logos/figan.svg")).toBeNull();
  });
});
