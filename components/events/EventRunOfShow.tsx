"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { getSupabaseBrowser } from "../../lib/supabaseBrowser";
import { toastError, toastSuccess } from "../../lib/toast";
import { getInventoryErrorMessage } from "../../lib/useInventory";

export type RunSlotRow = {
  id: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  title: string;
  notes: string;
  sortOrder: number;
};

type Props = {
  eventId: string;
  startDate: string;
  endDate: string;
};

function mapRow(raw: Record<string, unknown>): RunSlotRow {
  return {
    id: String(raw.id),
    slotDate: String(raw.slot_date),
    startTime: raw.start_time ? String(raw.start_time).slice(0, 5) : "",
    endTime: raw.end_time ? String(raw.end_time).slice(0, 5) : "",
    title: String(raw.title ?? ""),
    notes: String(raw.notes ?? ""),
    sortOrder: Number(raw.sort_order ?? 0) || 0,
  };
}

export default function EventRunOfShow(props: Props) {
  const { eventId, startDate, endDate } = props;
  const [slots, setSlots] = useState<RunSlotRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("event_run_slots")
        .select("id, slot_date, start_time, end_time, title, notes, sort_order")
        .eq("event_id", eventId)
        .order("slot_date", { ascending: true })
        .order("sort_order", { ascending: true });
      if (error) throw error;
      setSlots(((data ?? []) as Record<string, unknown>[]).map(mapRow));
    } catch (e) {
      toastError(getInventoryErrorMessage(e, "Feuille de route indisponible (migration appliquée ?)."));
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addSlot = async () => {
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.from("event_run_slots").insert({
      event_id: eventId,
      slot_date: startDate,
      start_time: "08:00",
      end_time: "10:00",
      title: "Nouveau créneau",
      notes: "",
      sort_order: slots.length,
    });
    if (error) {
      toastError(error.message);
      return;
    }
    toastSuccess("Créneau ajouté");
    await load();
  };

  const updateSlot = async (id: string, patch: Record<string, unknown>) => {
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.from("event_run_slots").update(patch).eq("id", id);
    if (error) {
      toastError(error.message);
      return;
    }
    await load();
  };

  const removeSlot = async (id: string) => {
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.from("event_run_slots").delete().eq("id", id);
    if (error) {
      toastError(error.message);
      return;
    }
    await load();
  };

  const daysBetween = useMemo(() => {
    const out: string[] = [];
    const s = new Date(`${startDate}T12:00:00`);
    const e = new Date(`${endDate}T12:00:00`);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return [startDate];
    for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      out.push(d.toISOString().slice(0, 10));
    }
    return out.length ? out : [startDate];
  }, [startDate, endDate]);

  return (
    <div className="ui-surface rounded-[24px] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Feuille de route</h2>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
            Planning jour par jour du salon ({daysBetween.length} jour(s)).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void addSlot()}
          className="ui-transition inline-flex items-center gap-1.5 rounded-xl bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-[var(--accent-contrast)]"
        >
          <Plus className="h-4 w-4" />
          Créneau
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-[color:var(--foreground)]/55">Chargement…</p>
      ) : slots.length === 0 ? (
        <p className="mt-4 text-sm text-[color:var(--foreground)]/55">
          Aucun créneau. Ajoutez montage, ouverture, permanence, démontage…
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {slots.map((slot) => (
            <li
              key={slot.id}
              className="grid gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-3 md:grid-cols-[120px_90px_90px_1fr_auto]"
            >
              <input
                type="date"
                value={slot.slotDate}
                min={startDate}
                max={endDate}
                onChange={(e) => void updateSlot(slot.id, { slot_date: e.target.value })}
                className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 text-xs"
              />
              <input
                type="time"
                value={slot.startTime}
                onChange={(e) => void updateSlot(slot.id, { start_time: e.target.value })}
                className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 text-xs"
              />
              <input
                type="time"
                value={slot.endTime}
                onChange={(e) => void updateSlot(slot.id, { end_time: e.target.value })}
                className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 text-xs"
              />
              <input
                value={slot.title}
                onChange={(e) => setSlots((prev) => prev.map((s) => (s.id === slot.id ? { ...s, title: e.target.value } : s)))}
                onBlur={(e) => void updateSlot(slot.id, { title: e.target.value.trim() })}
                className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => void removeSlot(slot.id)}
                className="ui-transition rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-700"
                aria-label="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <input
                value={slot.notes}
                placeholder="Notes"
                onChange={(e) => setSlots((prev) => prev.map((s) => (s.id === slot.id ? { ...s, notes: e.target.value } : s)))}
                onBlur={(e) => void updateSlot(slot.id, { notes: e.target.value.trim() })}
                className="ui-focus-ring md:col-span-4 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 text-xs"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
