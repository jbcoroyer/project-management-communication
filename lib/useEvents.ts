"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "./supabaseBrowser";
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
};

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
        .select("id, created_at, name, location, start_date, end_date, status, allocated_budget")
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

  useEffect(() => {
    const channel = supabase
      .channel("events-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        void loadEvents().catch(() => {});
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadEvents, supabase]);

  return useMemo(
    () => ({
      events,
      loading,
      loadEvents,
    }),
    [events, loading, loadEvents],
  );
}
