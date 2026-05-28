import { describe, expect, it } from "vitest";
import { mapTaskRow, parseProjectedWork } from "./taskMappers";
import { defaultColumns, defaultCompanies, defaultDomains } from "./types";

describe("parseProjectedWork", () => {
  it("retourne [] pour une entrée non-array", () => {
    expect(parseProjectedWork(null)).toEqual([]);
    expect(parseProjectedWork(undefined)).toEqual([]);
    expect(parseProjectedWork("foo")).toEqual([]);
    expect(parseProjectedWork({ date: "2026-01-01" })).toEqual([]);
  });

  it("filtre les items sans date ou sans heures > 0", () => {
    const result = parseProjectedWork([
      { date: "2026-01-01", hours: 3 },
      { date: "", hours: 2 },
      { date: "2026-01-02", hours: 0 },
      { date: "2026-01-03" },
    ]);
    expect(result).toEqual([{ date: "2026-01-01", hours: 3 }]);
  });

  it("calcule les heures depuis startTime/endTime si hours <= 0", () => {
    const result = parseProjectedWork([
      { date: "2026-01-01", hours: 0, startTime: "09:00", endTime: "12:30" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].hours).toBeCloseTo(3.5, 5);
    expect(result[0].startTime).toBe("09:00");
    expect(result[0].endTime).toBe("12:30");
  });

  it("garde hours fourni si > 0 même quand startTime/endTime présents", () => {
    const result = parseProjectedWork([
      { date: "2026-01-01", hours: 5, startTime: "09:00", endTime: "12:00" },
    ]);
    expect(result[0].hours).toBe(5);
  });

  it("traite la virgule comme séparateur décimal", () => {
    const result = parseProjectedWork([{ date: "2026-01-01", hours: "2,5" }]);
    expect(result[0].hours).toBe(2.5);
  });
});

describe("mapTaskRow", () => {
  it("retourne une Task avec des valeurs par défaut sur un row vide", () => {
    const task = mapTaskRow({});
    expect(task.id).toBe("");
    expect(task.projectName).toBe("");
    expect(task.company).toBe(defaultCompanies[0]);
    expect(task.domain).toBe(defaultDomains[0]);
    expect(task.column).toBe(defaultColumns[0]);
    expect(task.priority).toBe("Moyenne");
    expect(task.admins).toEqual([]);
    expect(task.isClientRequest).toBe(false);
    expect(task.isArchived).toBe(false);
    expect(task.elapsedMs).toBe(0);
    expect(task.estimatedHours).toBe(0);
    expect(task.parentTaskId).toBeUndefined();
    expect(task.completedAt).toBeUndefined();
  });

  it("parse correctement un row Supabase complet", () => {
    const row = {
      id: "task-1",
      created_at: "2026-01-01T10:00:00Z",
      project_name: "Refonte landing",
      company: "IDENA",
      domain: "🖥️ Digitale",
      admin: "Alice Dupont, Bob Martin",
      is_client_request: true,
      client_name: "Acme",
      request_date: "2025-12-15",
      deadline: "2026-02-01",
      budget: "5000",
      description: "Refondre la home et le formulaire de contact",
      column_id: "En cours",
      priority: "Haute",
      projected_work: [{ date: "2026-01-10", hours: 4 }],
      elapsed_ms: 3600000,
      is_running: false,
      is_archived: false,
      estimated_hours: 8,
      estimated_days: 1,
      completed_at: null,
      parent_task_id: null,
      event_id: "event-123",
      event_category: "Digital",
      events: { name: "Salon des Pros 2026" },
    };

    const task = mapTaskRow(row);
    expect(task.id).toBe("task-1");
    expect(task.projectName).toBe("Refonte landing");
    expect(task.company).toBe("IDENA");
    expect(task.admins).toEqual(["Alice Dupont", "Bob Martin"]);
    expect(task.isClientRequest).toBe(true);
    expect(task.priority).toBe("Haute");
    expect(task.column).toBe("En cours");
    expect(task.projectedWork).toHaveLength(1);
    expect(task.elapsedMs).toBe(3600000);
    expect(task.estimatedHours).toBe(8);
    expect(task.completedAt).toBeUndefined();
    expect(task.eventId).toBe("event-123");
    expect(task.eventCategory).toBe("Digital");
    expect(task.eventName).toBe("Salon des Pros 2026");
  });

  it("retombe sur 'Moyenne' si la priorité reçue n'est pas dans l'enum", () => {
    const task = mapTaskRow({ priority: "Critique" });
    expect(task.priority).toBe("Moyenne");
  });

  it("retombe sur la 1ère colonne par défaut si column_id est vide", () => {
    const task = mapTaskRow({ column_id: "   " });
    expect(task.column).toBe(defaultColumns[0]);
  });

  it("parse admin csv en ignorant les blancs", () => {
    expect(mapTaskRow({ admin: " Alice , , Bob " }).admins).toEqual(["Alice", "Bob"]);
    expect(mapTaskRow({ admin: "" }).admins).toEqual([]);
  });

  it("extrait eventName depuis un join array ou objet", () => {
    expect(mapTaskRow({ events: { name: "Salon X" } }).eventName).toBe("Salon X");
    expect(mapTaskRow({ events: [{ name: "Salon Y" }] }).eventName).toBe("Salon Y");
    expect(mapTaskRow({ events: null }).eventName).toBeNull();
    expect(mapTaskRow({}).eventName).toBeNull();
  });

  it("définit completedAt seulement quand la valeur est une string non vide", () => {
    expect(mapTaskRow({ completed_at: "2026-02-01T12:00:00Z" }).completedAt).toBe(
      "2026-02-01T12:00:00Z",
    );
    expect(mapTaskRow({ completed_at: null }).completedAt).toBeUndefined();
    expect(mapTaskRow({ completed_at: "" }).completedAt).toBeUndefined();
    expect(mapTaskRow({ completed_at: "  " }).completedAt).toBeUndefined();
  });
});
