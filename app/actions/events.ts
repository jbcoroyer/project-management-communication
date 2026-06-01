"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "../../lib/server/supabaseServer";
import { buildDefaultBudgetPosts } from "../../lib/eventBudgetUtils";
import { buildChecklistTaskRows, shiftTaskDeadline } from "../../lib/eventTaskFactory";
import type { EventClosureRecap, EventStatus } from "../../lib/eventTypes";
import { defaultCompanies, defaultDomains } from "../../lib/types";

export type CreateEventInput = {
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  status: EventStatus;
  allocatedBudget: number;
  templateKey?: string | null;
  defaultAdminName?: string;
};

export type CreateEventResult = { ok: true; eventId: string } | { ok: false; error: string };

export type DuplicateEventInput = {
  sourceEventId: string;
  name: string;
  startDate: string;
  endDate: string;
  copyTasks: boolean;
};

export type DuplicateEventResult = { ok: true; eventId: string } | { ok: false; error: string };

export type CloseEventRecapInput = {
  eventId: string;
  notes?: string;
};

const DEDUP_WINDOW_MS = 12_000;
const EVENT_DOMAIN = defaultDomains.find((d) => d.includes("Event")) ?? defaultDomains[0];

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

  const budgetPosts = buildDefaultBudgetPosts(Math.max(0, Number(input.allocatedBudget) || 0));

  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({
      name,
      location: input.location.trim(),
      start_date: input.startDate,
      end_date: input.endDate,
      status: input.status,
      allocated_budget: Math.max(0, Number(input.allocatedBudget) || 0),
      budget_posts: budgetPosts,
      template_key: input.templateKey?.trim() || null,
    })
    .select("id")
    .single();

  if (eventError || !event?.id) {
    return { ok: false, error: eventError?.message ?? "Création de l'événement impossible." };
  }

  const eventId = event.id as string;
  const adminName = input.defaultAdminName?.trim() || "";

  if (input.templateKey && adminName) {
    const rows = buildChecklistTaskRows({
      eventId,
      startDate: input.startDate,
      templateKey: input.templateKey,
      defaultAdmin: adminName,
    });
    if (rows.length > 0) {
      const { error: taskErr } = await supabase.from("tasks").insert(rows);
      if (taskErr) {
        return {
          ok: false,
          error: `Événement créé mais checklist non générée : ${taskErr.message}`,
        };
      }
    }
  }

  revalidatePath("/events/dashboard");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/");
  return { ok: true, eventId };
}

export async function duplicateEvent(input: DuplicateEventInput): Promise<DuplicateEventResult> {
  const supabase = await createServerSupabase();
  const sourceId = input.sourceEventId?.trim();
  if (!sourceId) return { ok: false, error: "Événement source manquant." };

  const { data: source, error: srcErr } = await supabase
    .from("events")
    .select(
      "id, name, location, start_date, end_date, status, allocated_budget, budget_posts, template_key",
    )
    .eq("id", sourceId)
    .maybeSingle();

  if (srcErr || !source) {
    return { ok: false, error: srcErr?.message ?? "Événement source introuvable." };
  }

  const row = source as Record<string, unknown>;
  const budgetPosts = (row.budget_posts as Record<string, number> | null) ?? buildDefaultBudgetPosts(
    Math.max(0, Number(row.allocated_budget ?? 0) || 0),
  );

  const { data: created, error: createErr } = await supabase
    .from("events")
    .insert({
      name: input.name.trim() || `${String(row.name)} (copie)`,
      location: String(row.location ?? ""),
      start_date: input.startDate,
      end_date: input.endDate,
      status: "Brouillon",
      allocated_budget: Math.max(0, Number(row.allocated_budget ?? 0) || 0),
      budget_posts: budgetPosts,
      template_key: (row.template_key as string | null) ?? null,
    })
    .select("id")
    .single();

  if (createErr || !created?.id) {
    return { ok: false, error: createErr?.message ?? "Duplication impossible." };
  }

  const newId = created.id as string;

  if (input.copyTasks) {
    const { data: sourceTasks, error: taskLoadErr } = await supabase
      .from("tasks")
      .select(
        "project_name, event_category, company, domain, admin, lane, is_client_request, client_name, deadline, budget, description, column_id, priority, projected_work, estimated_hours, estimated_days",
      )
      .eq("event_id", sourceId);

    if (taskLoadErr) {
      return { ok: false, error: taskLoadErr.message };
    }

    const sourceStart = String(row.start_date);
    const inserts = (sourceTasks ?? []).map((t) => {
      const tr = t as Record<string, unknown>;
      return {
        project_name: tr.project_name,
        event_id: newId,
        event_category: tr.event_category,
        company: tr.company ?? defaultCompanies[0],
        domain: tr.domain ?? EVENT_DOMAIN,
        admin: tr.admin,
        lane: tr.lane ?? tr.admin,
        is_client_request: tr.is_client_request ?? false,
        client_name: tr.client_name ?? "",
        deadline: shiftTaskDeadline(
          typeof tr.deadline === "string" ? tr.deadline : null,
          sourceStart,
          input.startDate,
        ),
        budget: tr.budget ?? "",
        description: tr.description ?? "",
        column_id: "À faire",
        priority: tr.priority ?? "Moyenne",
        projected_work: tr.projected_work ?? [],
        elapsed_ms: 0,
        is_running: false,
        last_start_time_ms: null,
        is_archived: false,
        estimated_hours: tr.estimated_hours ?? 0,
        estimated_days: tr.estimated_days ?? 0,
        completed_at: null,
      };
    });

    if (inserts.length > 0) {
      const { error: insErr } = await supabase.from("tasks").insert(inserts);
      if (insErr) return { ok: false, error: insErr.message };
    }
  }

  revalidatePath("/events/dashboard");
  revalidatePath(`/events/${newId}`);
  revalidatePath("/");
  return { ok: true, eventId: newId };
}

export async function saveEventBudgetPosts(
  eventId: string,
  posts: Record<string, number>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("events").update({ budget_posts: posts }).eq("id", eventId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/events/${eventId}`);
  return { ok: true };
}

export async function closeEventWithRecap(
  input: CloseEventRecapInput,
  recap: EventClosureRecap,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("events")
    .update({
      status: "Terminé",
      closure_recap: { ...recap, notes: input.notes?.trim() || recap.notes },
    })
    .eq("id", input.eventId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/events/dashboard");
  revalidatePath(`/events/${input.eventId}`);
  return { ok: true };
}

export type DeleteEventResult = { ok: true } | { ok: false; error: string };

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
