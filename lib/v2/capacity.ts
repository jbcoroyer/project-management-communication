"use client";

import { useCallback, useEffect, useState } from "react";
import { addWeeks, isWithinInterval, parse, startOfWeek } from "date-fns";
import type { Task } from "../types";
import { DONE_COLUMN_NAME } from "../workflowConstants";

export const WEEKLY_CAPACITY = 35;

export type WeekKey = string; // ISO date du lundi (yyyy-MM-dd)

export function weekKeyOf(date: Date): WeekKey {
  return startOfWeek(date, { weekStartsOn: 1 }).toISOString().slice(0, 10);
}

export function buildWeekKeys(count: number, from: Date = new Date()): WeekKey[] {
  const start = startOfWeek(from, { weekStartsOn: 1 });
  return Array.from({ length: count }, (_, i) => weekKeyOf(addWeeks(start, i)));
}

export type WeeklyLoad = {
  person: string;
  /** heures planifiées par semaine (clé = lundi ISO). */
  byWeek: Record<WeekKey, number>;
  total: number;
};

function estimateContribution(task: Task): number {
  if (task.eventCategory === "Stand") return 0;
  if (task.estimatedHours > 0) return task.estimatedHours;
  if (task.estimatedDays > 0) return task.estimatedDays * 7;
  return 0;
}

/** Charge hebdomadaire par personne sur une fenêtre de semaines (baseline, données réelles). */
export function buildWeeklyWorkload(tasks: Task[], weekKeys: WeekKey[], people: string[]): WeeklyLoad[] {
  const weekSet = new Set(weekKeys);
  const map = new Map<string, WeeklyLoad>();
  const ensure = (person: string) => {
    let p = map.get(person);
    if (!p) {
      p = { person, byWeek: Object.fromEntries(weekKeys.map((k) => [k, 0])), total: 0 };
      map.set(person, p);
    }
    return p;
  };
  for (const person of people) ensure(person);

  const add = (person: string, week: WeekKey, hours: number) => {
    if (hours <= 0 || !weekSet.has(week)) return;
    const p = ensure(person);
    p.byWeek[week] = (p.byWeek[week] ?? 0) + hours;
    p.total += hours;
  };

  for (const task of tasks) {
    if (task.isArchived || task.parentTaskId || task.column === DONE_COLUMN_NAME) continue;
    const assignees = task.admins.filter(Boolean);
    if (assignees.length === 0) continue;

    const slots = task.projectedWork.filter((s) => s.date && s.hours > 0);
    for (const person of assignees) {
      if (slots.length > 0) {
        for (const slot of slots) {
          const d = parse(slot.date.slice(0, 10), "yyyy-MM-dd", new Date());
          if (Number.isNaN(d.getTime())) continue;
          add(person, weekKeyOf(d), slot.hours / assignees.length);
        }
      } else if (task.deadline) {
        const d = new Date(task.deadline);
        if (!Number.isNaN(d.getTime())) add(person, weekKeyOf(d), estimateContribution(task) / assignees.length);
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

// ── 7.1 — Placeholders / projets tentatifs (scénarios) ──

export type Placeholder = {
  id: string;
  name: string;
  /** personne ciblée, ou null pour un rôle/domaine à staffer. */
  person: string | null;
  domain: string | null;
  hoursPerWeek: number;
  startWeek: WeekKey;
  weeks: number;
  confirmed: boolean;
};

const LOCAL_KEY = "v2-capacity-placeholders";

function readPlaceholders(): Placeholder[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Placeholder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePlaceholders(list: Placeholder[]) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    /* ignoré */
  }
}

export function usePlaceholders() {
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);

  useEffect(() => {
    setPlaceholders(readPlaceholders());
  }, []);

  const add = useCallback((p: Omit<Placeholder, "id">) => {
    setPlaceholders((prev) => {
      const next = [
        ...prev,
        { ...p, id: globalThis.crypto?.randomUUID?.() ?? `ph-${Date.now()}` },
      ];
      writePlaceholders(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setPlaceholders((prev) => {
      const next = prev.filter((p) => p.id !== id);
      writePlaceholders(next);
      return next;
    });
  }, []);

  const toggleConfirmed = useCallback((id: string) => {
    setPlaceholders((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, confirmed: !p.confirmed } : p));
      writePlaceholders(next);
      return next;
    });
  }, []);

  return { placeholders, add, remove, toggleConfirmed };
}

/** Applique les placeholders à la baseline pour produire la charge « ajustée » (scénario). */
export function applyPlaceholders(
  baseline: WeeklyLoad[],
  weekKeys: WeekKey[],
  placeholders: Placeholder[],
): WeeklyLoad[] {
  const clone: WeeklyLoad[] = baseline.map((p) => ({
    person: p.person,
    byWeek: { ...p.byWeek },
    total: p.total,
  }));
  const index = new Map(clone.map((p) => [p.person, p]));
  const weekOrder = weekKeys;

  for (const ph of placeholders) {
    const target = ph.person ?? "(non staffé)";
    let load = index.get(target);
    if (!load) {
      load = { person: target, byWeek: Object.fromEntries(weekKeys.map((k) => [k, 0])), total: 0 };
      index.set(target, load);
      clone.push(load);
    }
    const startIdx = weekOrder.indexOf(ph.startWeek);
    if (startIdx === -1) continue;
    for (let i = 0; i < ph.weeks; i += 1) {
      const wk = weekOrder[startIdx + i];
      if (!wk) break;
      load.byWeek[wk] = (load.byWeek[wk] ?? 0) + ph.hoursPerWeek;
      load.total += ph.hoursPerWeek;
    }
  }

  return clone.sort((a, b) => b.total - a.total);
}

// ── 7.2 — Prédiction / semaines à risque ──

export type WeekRisk = {
  week: WeekKey;
  totalHours: number;
  totalCapacity: number;
  utilization: number; // 0..n
  level: "under" | "ok" | "high" | "over";
  overloadedPeople: string[];
};

export function assessWeekRisks(loads: WeeklyLoad[], weekKeys: WeekKey[]): WeekRisk[] {
  const peopleCount = Math.max(1, loads.length);
  return weekKeys.map((week) => {
    let total = 0;
    const overloadedPeople: string[] = [];
    for (const p of loads) {
      const h = p.byWeek[week] ?? 0;
      total += h;
      if (h > WEEKLY_CAPACITY + 0.01) overloadedPeople.push(p.person);
    }
    const totalCapacity = peopleCount * WEEKLY_CAPACITY;
    const utilization = totalCapacity > 0 ? total / totalCapacity : 0;
    let level: WeekRisk["level"] = "ok";
    if (utilization < 0.5) level = "under";
    else if (utilization > 1) level = "over";
    else if (utilization > 0.85) level = "high";
    return { week, totalHours: total, totalCapacity, utilization, level, overloadedPeople };
  });
}

// ── 7.3 — Staffing par compétences / domaines ──

export type SkillProfile = {
  person: string;
  /** heures historiques par domaine. */
  byDomain: Record<string, number>;
  totalHours: number;
};

/** Déduit l'affinité de chaque personne par domaine à partir de l'historique des tâches. */
export function buildSkillProfiles(tasks: Task[], people: string[]): SkillProfile[] {
  const map = new Map<string, SkillProfile>();
  for (const person of people) map.set(person, { person, byDomain: {}, totalHours: 0 });

  for (const task of tasks) {
    if (task.parentTaskId) continue;
    const domain = task.domain || "Autre";
    const hours = task.estimatedHours > 0 ? task.estimatedHours : 1;
    for (const person of task.admins.filter(Boolean)) {
      const profile = map.get(person) ?? { person, byDomain: {}, totalHours: 0 };
      profile.byDomain[domain] = (profile.byDomain[domain] ?? 0) + hours;
      profile.totalHours += hours;
      map.set(person, profile);
    }
  }

  return Array.from(map.values());
}

export type StaffingSuggestion = {
  person: string;
  affinity: number; // 0..1 part du domaine dans l'historique
  domainHours: number;
  currentWeekHours: number;
  availableHours: number;
  score: number;
};

/** Classe les personnes pour un besoin (domaine + heures) selon affinité et disponibilité. */
export function suggestStaffing(
  domain: string,
  hoursNeeded: number,
  profiles: SkillProfile[],
  weekLoad: WeeklyLoad[],
  week: WeekKey,
): StaffingSuggestion[] {
  const loadByPerson = new Map(weekLoad.map((l) => [l.person, l.byWeek[week] ?? 0]));
  return profiles
    .map((p) => {
      const domainHours = p.byDomain[domain] ?? 0;
      const affinity = p.totalHours > 0 ? domainHours / p.totalHours : 0;
      const currentWeekHours = loadByPerson.get(p.person) ?? 0;
      const availableHours = Math.max(0, WEEKLY_CAPACITY - currentWeekHours);
      const fit = Math.min(1, availableHours / Math.max(1, hoursNeeded));
      const score = affinity * 0.6 + fit * 0.4;
      return { person: p.person, affinity, domainHours, currentWeekHours, availableHours, score };
    })
    .sort((a, b) => b.score - a.score);
}
