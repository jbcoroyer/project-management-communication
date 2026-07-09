"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "../supabaseBrowser";
import type { Priority } from "../types";

export type IntakeStatus = "triage" | "accepted" | "rejected";

export type IntakeRequest = {
  id: string;
  createdAt: string;
  title: string;
  description: string;
  company: string;
  /** Support attendu (ex. flyer, visuel RS…). */
  concern: string;
  supportFormat: string;
  deadline: string;
  budget: string;
  estimatedHours: number;
  requesterName: string;
  requesterService: string;
  priority: Priority;
  status: IntakeStatus;
  suggestedDomain: string | null;
  suggestedAssignee: string | null;
  linkedTaskId: string | null;
  decidedAt: string | null;
};

export type IntakeBackend = "supabase" | "local";

const LOCAL_KEY = "v2-intake-requests";

type IntakeRow = {
  id: string;
  created_at: string;
  title: string;
  description: string | null;
  company?: string | null;
  concern?: string | null;
  support_format?: string | null;
  deadline?: string | null;
  budget?: string | null;
  estimated_hours?: number | null;
  requester_name: string | null;
  requester_service: string | null;
  priority: string | null;
  status: string | null;
  suggested_domain: string | null;
  suggested_assignee: string | null;
  linked_task_id: string | null;
  decided_at: string | null;
};

function rowToRequest(row: IntakeRow): IntakeRequest {
  return {
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    description: row.description ?? "",
    company: row.company ?? "",
    concern: row.concern ?? "",
    supportFormat: row.support_format ?? "",
    deadline: row.deadline?.slice(0, 10) ?? "",
    budget: row.budget ?? "",
    estimatedHours: row.estimated_hours ?? 0,
    requesterName: row.requester_name ?? "",
    requesterService: row.requester_service ?? "",
    priority: (row.priority as Priority) ?? "Moyenne",
    status: (row.status as IntakeStatus) ?? "triage",
    suggestedDomain: row.suggested_domain,
    suggestedAssignee: row.suggested_assignee,
    linkedTaskId: row.linked_task_id,
    decidedAt: row.decided_at,
  };
}

function normalizeLocal(entry: Partial<IntakeRequest> & Pick<IntakeRequest, "id" | "createdAt" | "title">): IntakeRequest {
  return {
    id: entry.id,
    createdAt: entry.createdAt,
    title: entry.title,
    description: entry.description ?? "",
    company: entry.company ?? "",
    concern: entry.concern ?? "",
    supportFormat: entry.supportFormat ?? "",
    deadline: entry.deadline ?? "",
    budget: entry.budget ?? "",
    estimatedHours: entry.estimatedHours ?? 0,
    requesterName: entry.requesterName ?? "",
    requesterService: entry.requesterService ?? "",
    priority: entry.priority ?? "Moyenne",
    status: entry.status ?? "triage",
    suggestedDomain: entry.suggestedDomain ?? null,
    suggestedAssignee: entry.suggestedAssignee ?? null,
    linkedTaskId: entry.linkedTaskId ?? null,
    decidedAt: entry.decidedAt ?? null,
  };
}

function readLocal(): IntakeRequest[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<IntakeRequest>[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((r) =>
      normalizeLocal({
        ...r,
        id: r.id ?? newId(),
        createdAt: r.createdAt ?? new Date().toISOString(),
        title: r.title ?? "",
      }),
    );
  } catch {
    return [];
  }
}

function writeLocal(list: IntakeRequest[]) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    /* ignoré */
  }
}

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `req-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function suggestDomainFromText(text: string): string {
  const t = text.toLowerCase();
  if (/(print|impress|flyer|brochure|affiche|kakemono|roll)/.test(t)) return "🖨️ Print";
  if (/(insta|linkedin|facebook|post|réseau|reseau|social|story|reel)/.test(t)) return "🖥️ Digitale";
  if (/(presse|communiqu|journalist|média|media|rp )/.test(t)) return "📰 Presse";
  if (/(salon|stand|event|événement|evenement|expo|foire)/.test(t)) return "🎟️ Event";
  if (/(client|devis|commande)/.test(t)) return "📮 Client";
  return "🌎 General";
}

async function detectBackend(supabase: SupabaseClient): Promise<IntakeBackend> {
  const { error } = await supabase.from("intake_requests").select("id").limit(1);
  return error ? "local" : "supabase";
}

export function useIntakeRequests() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [requests, setRequests] = useState<IntakeRequest[]>([]);
  const [backend, setBackend] = useState<IntakeBackend>("local");
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const mode = await detectBackend(supabase);
    setBackend(mode);
    if (mode === "supabase") {
      const { data } = await supabase
        .from("intake_requests")
        .select("*")
        .order("created_at", { ascending: false });
      setRequests(((data ?? []) as IntakeRow[]).map(rowToRequest));
    } else {
      setRequests(readLocal().sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateRequest = useCallback(
    async (id: string, patch: Partial<IntakeRequest>) => {
      setRequests((prev) => {
        const next = prev.map((r) => (r.id === id ? { ...r, ...patch } : r));
        if (backend === "local") writeLocal(next);
        return next;
      });
      if (backend === "supabase") {
        const dbPatch: Record<string, unknown> = {};
        if (patch.status !== undefined) dbPatch.status = patch.status;
        if (patch.linkedTaskId !== undefined) dbPatch.linked_task_id = patch.linkedTaskId;
        if (patch.decidedAt !== undefined) dbPatch.decided_at = patch.decidedAt;
        if (patch.suggestedDomain !== undefined) dbPatch.suggested_domain = patch.suggestedDomain;
        if (patch.suggestedAssignee !== undefined) dbPatch.suggested_assignee = patch.suggestedAssignee;
        if (patch.budget !== undefined) dbPatch.budget = patch.budget;
        if (patch.estimatedHours !== undefined) dbPatch.estimated_hours = patch.estimatedHours;
        if (patch.priority !== undefined) dbPatch.priority = patch.priority;
        if (Object.keys(dbPatch).length > 0) {
          await supabase.from("intake_requests").update(dbPatch).eq("id", id);
        }
      }
    },
    [backend, supabase],
  );

  return { requests, backend, loading, reload, updateRequest };
}

/** Champs saisis par les collaborateurs externes via le portail Ask. */
export type SubmitIntakeInput = {
  title: string;
  expectedSupport: string;
  supportFormat: string;
  company: string;
  deadline: string;
  description: string;
  requesterName?: string;
  requesterService?: string;
};

export async function submitIntakeRequest(input: SubmitIntakeInput): Promise<{ ok: boolean; backend: IntakeBackend }> {
  const supabase = getSupabaseBrowser();
  const domainText = `${input.title} ${input.expectedSupport} ${input.supportFormat} ${input.description}`;
  const suggestedDomain = suggestDomainFromText(domainText);
  const mode = await detectBackend(supabase);

  const payload = {
    title: input.title,
    description: input.description,
    company: input.company,
    concern: input.expectedSupport,
    support_format: input.supportFormat,
    deadline: input.deadline,
    budget: "",
    estimated_hours: 0,
    requester_name: input.requesterName ?? "",
    requester_service: input.requesterService ?? "",
    priority: "Moyenne",
    status: "triage",
    suggested_domain: suggestedDomain,
  };

  if (mode === "supabase") {
    const { error } = await supabase.from("intake_requests").insert(payload);
    return { ok: !error, backend: "supabase" };
  }

  const entry = normalizeLocal({
    id: newId(),
    createdAt: new Date().toISOString(),
    title: input.title,
    description: input.description,
    company: input.company,
    concern: input.expectedSupport,
    supportFormat: input.supportFormat,
    deadline: input.deadline,
    budget: "",
    estimatedHours: 0,
    requesterName: input.requesterName ?? "",
    requesterService: input.requesterService ?? "",
    priority: "Moyenne",
    status: "triage",
    suggestedDomain,
    suggestedAssignee: null,
    linkedTaskId: null,
    decidedAt: null,
  });
  writeLocal([entry, ...readLocal()]);
  return { ok: true, backend: "local" };
}
