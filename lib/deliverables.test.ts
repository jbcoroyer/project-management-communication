import { describe, expect, it } from "vitest";
import {
  deliverableFileError,
  isPdfDeliverable,
  mapDeliverableRow,
} from "./deliverables";
import { toV3Path } from "./appVersion";

describe("deliverableFileError", () => {
  it("accepte une image légère", () => {
    const file = new File([new Uint8Array(10)], "a.png", { type: "image/png" });
    expect(deliverableFileError(file)).toBeNull();
  });

  it("refuse un fichier trop lourd", () => {
    const file = new File([new Uint8Array(6 * 1024 * 1024)], "a.png", { type: "image/png" });
    expect(deliverableFileError(file)).toMatch(/5 Mo/);
  });
});

describe("isPdfDeliverable", () => {
  it("détecte mime et extension", () => {
    expect(isPdfDeliverable({ fileMime: "application/pdf", fileName: null, fileUrl: null })).toBe(
      true,
    );
    expect(
      isPdfDeliverable({ fileMime: null, fileName: "doc.PDF", fileUrl: null }),
    ).toBe(true);
  });
});

describe("mapDeliverableRow", () => {
  it("mappe task_id et notes", () => {
    const d = mapDeliverableRow(
      {
        id: "1",
        created_at: "2026-01-01T00:00:00Z",
        completed_at: "2026-01-02",
        project_name: "P",
        company: "IDENA",
        server_path: "\\\\srv\\p",
        file_name: null,
        file_mime: null,
        file_size_bytes: null,
        storage_path: "u/a.png",
        public_url: null,
        task_id: "task-1",
        created_by: "user-1",
        notes: "final",
      },
      "https://signed.example/a.png",
    );
    expect(d.taskId).toBe("task-1");
    expect(d.notes).toBe("final");
    expect(d.fileUrl).toBe("https://signed.example/a.png");
  });
});

describe("paths V3", () => {
  it("redirige livrables et idées vers V3", () => {
    expect(toV3Path("/v2/ideas")).toBe("/v3/ideas");
    expect(toV3Path("/deliverables")).toBe("/v3/deliverables");
  });
});
