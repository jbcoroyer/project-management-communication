"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "../../lib/server/supabaseServer";
import type { EventStatus } from "../../lib/eventTypes";

export type CreateEventInput = {
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  status: EventStatus;
  allocatedBudget: number;
};

export type CreateEventResult = { ok: true; eventId: string } | { ok: false; error: string };

/** Fenêtre anti-doublon : même nom + mêmes dates créés peu avant = requête répétée (double clic, retry réseau). */
const DEDUP_WINDOW_MS = 12_000;

export async function createEventWithTasks(input: CreateEventInput): Promise<CreateEventResult> {
  const name = input.name.trim();
  if (!name) {
    return { ok: false, error: "Le nom de l'événement est obligatoire." };
  }

  const supabase = await createServerSupabase();

  const sinceIso = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();

  const { data: recentDuplicate } = await supabase
    .from("events")
    .select("id")
    .eq("name", name)
    .eq("start_date", input.startDate)
    .eq("end_date", input.endDate)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentDuplicate?.id) {
    const existingId = recentDuplicate.id as string;
    revalidatePath("/events/dashboard");
    revalidatePath(`/events/${existingId}`);
    return { ok: true, eventId: existingId };
  }

  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({
      name,
      location: input.location.trim(),
      start_date: input.startDate,
      end_date: input.endDate,
      status: input.status,
      allocated_budget: Math.max(0, Number(input.allocatedBudget) || 0),
    })
    .select("id")
    .single();

  if (eventError || !event?.id) {
    return { ok: false, error: eventError?.message ?? "Création de l'événement impossible." };
  }

  const eventId = event.id as string;

  revalidatePath("/events/dashboard");
  revalidatePath(`/events/${eventId}`);
  return { ok: true, eventId };
}

export type DeleteEventResult = { ok: true } | { ok: false; error: string };

/** Supprime les tâches liées puis l’événement (dépenses en cascade, mouvements stock : event_id → null). */
export async function deleteEvent(eventId: string): Promise<DeleteEventResult> {
  const id = eventId?.trim();
  if (!id) {
    return { ok: false, error: "Identifiant d'événement manquant." };
  }
  const supabase = await createServerSupabase();

  const { error: taskErr } = await supabase.from("tasks").delete().eq("event_id", id);
  if (taskErr) {
    return { ok: false, error: taskErr.message };
  }

  const { error: evErr } = await supabase.from("events").delete().eq("id", id);
  if (evErr) {
    return { ok: false, error: evErr.message };
  }

  revalidatePath("/events/dashboard");
  revalidatePath(`/events/${id}`);
  revalidatePath("/");
  return { ok: true };
}
