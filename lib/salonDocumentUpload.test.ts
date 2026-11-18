import { describe, expect, it } from "vitest";
import { SALON_DOC_MAX_BYTES, isSalonDocFile, salonDocFileError } from "./salonDocumentUpload";

function fakeFile(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(Math.min(size, 16))], { type });
  const file = new File([blob], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("salonDocumentUpload", () => {
  it("accepte PDF et images sous 5 Mo", () => {
    expect(salonDocFileError(fakeFile("devis.pdf", "application/pdf", 1024))).toBeNull();
    expect(salonDocFileError(fakeFile("plan.png", "image/png", 2048))).toBeNull();
    expect(isSalonDocFile(fakeFile("x.pdf", "application/pdf", 10))).toBe(true);
  });

  it("refuse les formats hors scope et les fichiers > 5 Mo", () => {
    expect(salonDocFileError(fakeFile("notes.docx", "application/msword", 100))).toMatch(
      /Formats acceptés/,
    );
    expect(
      salonDocFileError(fakeFile("gros.pdf", "application/pdf", SALON_DOC_MAX_BYTES + 1)),
    ).toMatch(/5 Mo/);
  });
});
