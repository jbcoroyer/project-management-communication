"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "./supabaseBrowser";
import { useRealtimeReload } from "./useRealtimeReload";
import type { EventRow, EventStatus } from "./eventTypes";

type EventDbRow = {
  id: string;
  created_at: string;
  name: string | null;
  location: string | null;
  start_date: string;
  end_date: string;
  status: string | null;
  allocated_budget: number | string | null;
  budget_posts?: unknown;
  template_key?: string | null;
  closure_recap?: unknown;
};

function parseBudgetPosts(raw: unknown): EventRow["budgetPosts"] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) out[k] = n;
  }
  return out;
}

function mapEvent(row: EventDbRow): EventRow {
  const status = (row.status ?? "Brouillon") as EventStatus;
  return {
    id: row.id,
    createdAt: row.created_at,
    name: row.name ?? "",
    location: row.location ?? "",
    startDate: row.start_date,
    endDate: row.end_date,
    status,
    allocatedBudget: Math.max(0, Number(row.allocated_budget ?? 0) || 0),
    budgetPosts: parseBudgetPosts(row.budget_posts),
    templateKey: row.template_key ?? null,
    closureRecap:
      row.closure_recap && typeof row.closure_recap === "object" && !Array.isArray(row.closure_recap)
        ? (row.closure_recap as EventRow["closureRecap"])
        : null,
  };
}

export function useEvents() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select(
          "id, created_at, name, location, start_date, end_date, status, allocated_budget, budget_posts, template_key, closure_recap",
        )
        .order("start_date", { ascending: true });
      if (error) throw error;
      setEvents(((data ?? []) as EventDbRow[]).map(mapEvent));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadEvents().catch(() => setEvents([]));
  }, [loadEvents]);

  useRealtimeReload({
    table: "events",
    channelName: "events-realtime",
    onChange: useCallback(() => {
      void loadEvents().catch(() => {});
    }, [loadEvents]),
  });

  return useMemo(
    () => ({
      events,
      loading,
      loadEvents,
    }),
    [events, loading, loadEvents],
  );
}
