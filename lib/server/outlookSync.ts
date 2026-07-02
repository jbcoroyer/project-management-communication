/**
 * Logique de synchronisation d'une tâche vers l'agenda Outlook de l'utilisateur.
 * Serveur uniquement (utilise la clé service_role pour lire/écrire les jetons).
 *
 * Principe : chaque entrée `projected_work` d'une tâche (un jour ou un créneau)
 * devient un événement d'agenda. On réconcilie l'état souhaité avec les
 * événements déjà créés (table outlook_calendar_events) pour créer / mettre à
 * jour / supprimer ce qu'il faut, de façon idempotente.
 */
import { createSupabaseAdmin } from "./supabaseAdmin";
import { taskRowConcernsUser } from "../taskConcernsUser";
import type { ServerUserIdentity } from "./userIdentity";
import {
  MS_TIMEZONE,
  createEvent,
  deleteEvent,
  refreshAccessToken,
  updateEvent,
  type GraphEventPayload,
} from "./microsoftGraph";

export type ProjectedWorkItem = {
  date: string;
  hours?: number;
  startTime?: string;
  endTime?: string;
};

export type TaskForSync = {
  id: string;
  projectName: string;
  description?: string | null;
  company?: string | null;
  domain?: string | null;
  projectedWork: ProjectedWorkItem[];
};

type ConnectionRow = {
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  account_email: string | null;
};

/** Marge avant expiration (5 min) pour rafraîchir le jeton de façon proactive. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export async function getOutlookConnection(userId: string): Promise<ConnectionRow | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("outlook_connections")
    .select("user_id, access_token, refresh_token, token_expires_at, account_email")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as ConnectionRow | null) ?? null;
}

export async function deleteOutlookConnection(userId: string): Promise<void> {
  const admin = createSupabaseAdmin();
  await admin.from("outlook_calendar_events").delete().eq("user_id", userId);
  await admin.from("outlook_connections").delete().eq("user_id", userId);
}

/**
 * Renvoie un access_token valide pour l'utilisateur, en rafraîchissant et en
 * persistant le jeton si nécessaire. Renvoie null si l'utilisateur n'a pas
 * connecté Outlook.
 */
async function getValidAccessToken(userId: string): Promise<string | null> {
  const conn = await getOutlookConnection(userId);
  if (!conn) return null;

  const expiresAt = new Date(conn.token_expires_at).getTime();
  if (Number.isFinite(expiresAt) && expiresAt - Date.now() > REFRESH_MARGIN_MS) {
    return conn.access_token;
  }

  const refreshed = await refreshAccessToken(conn.refresh_token);
  const admin = createSupabaseAdmin();
  await admin
    .from("outlook_connections")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? conn.refresh_token,
      token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  return refreshed.access_token;
}

/**
 * Supprime tous les événements Outlook associés à une tâche (archivage / suppression).
 * Best-effort : ignore les événements déjà disparus côté Outlook.
 */
export async function removeTaskFromOutlook(userId: string, taskId: string): Promise<SyncResult> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return { connected: false, created: 0, updated: 0, deleted: 0 };

  const admin = createSupabaseAdmin();
  const { data: rows } = await admin
    .from("outlook_calendar_events")
    .select("id, outlook_event_id")
    .eq("user_id", userId)
    .eq("task_id", taskId);

  let deleted = 0;
  for (const row of (rows ?? []) as Array<{ id: string; outlook_event_id: string }>) {
    await deleteEvent(accessToken, row.outlook_event_id);
    await admin.from("outlook_calendar_events").delete().eq("id", row.id);
    deleted += 1;
  }
  return { connected: true, created: 0, updated: 0, deleted };
}

function occurrenceKey(item: ProjectedWorkItem): string {
  return `${item.date}|${item.startTime ?? ""}|${item.endTime ?? ""}`;
}

function buildEventPayload(task: TaskForSync, item: ProjectedWorkItem): GraphEventPayload {
  const contextLines: string[] = [];
  if (task.company) contextLines.push(`Société : ${task.company}`);
  if (task.domain) contextLines.push(`Domaine : ${task.domain}`);
  if (task.description?.trim()) contextLines.push("", task.description.trim());
  const body = {
    contentType: "Text" as const,
    content: [`Tâche planifiée depuis Service Communication IDENA.`, "", ...contextLines].join("\n"),
  };

  if (item.startTime && item.endTime) {
    return {
      subject: task.projectName,
      body,
      start: { dateTime: `${item.date}T${item.startTime}:00`, timeZone: MS_TIMEZONE },
      end: { dateTime: `${item.date}T${item.endTime}:00`, timeZone: MS_TIMEZONE },
      isAllDay: false,
    };
  }

  // Jour sans créneau → événement « journée entière ».
  const start = new Date(`${item.date}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const endDate = end.toISOString().slice(0, 10);
  return {
    subject: task.projectName,
    body,
    start: { date: item.date },
    end: { date: endDate },
    isAllDay: true,
  };
}

export type SyncResult = {
  connected: boolean;
  created: number;
  updated: number;
  deleted: number;
};

/**
 * Synchronise la tâche dans l'agenda Outlook de l'utilisateur.
 * Idempotent : peut être appelé à chaque création/modification de tâche.
 */
export async function syncTaskToOutlook(userId: string, task: TaskForSync): Promise<SyncResult> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return { connected: false, created: 0, updated: 0, deleted: 0 };

  const admin = createSupabaseAdmin();

  const desired = new Map<string, ProjectedWorkItem>();
  for (const item of task.projectedWork ?? []) {
    if (!item?.date) continue;
    desired.set(occurrenceKey(item), item);
  }

  const { data: existingRows } = await admin
    .from("outlook_calendar_events")
    .select("id, occurrence_key, outlook_event_id")
    .eq("user_id", userId)
    .eq("task_id", task.id);

  const existing = new Map<string, { id: string; outlook_event_id: string }>();
  for (const row of (existingRows ?? []) as Array<{
    id: string;
    occurrence_key: string;
    outlook_event_id: string;
  }>) {
    existing.set(row.occurrence_key, { id: row.id, outlook_event_id: row.outlook_event_id });
  }

  let created = 0;
  let updated = 0;
  let deleted = 0;

  // Supprimer les occurrences qui n'existent plus.
  for (const [key, row] of existing) {
    if (desired.has(key)) continue;
    await deleteEvent(accessToken, row.outlook_event_id);
    await admin.from("outlook_calendar_events").delete().eq("id", row.id);
    deleted += 1;
  }

  // Créer / mettre à jour les occurrences souhaitées.
  for (const [key, item] of desired) {
    const payload = buildEventPayload(task, item);
    const current = existing.get(key);
    if (current) {
      const stillExists = await updateEvent(accessToken, current.outlook_event_id, payload);
      if (stillExists) {
        await admin
          .from("outlook_calendar_events")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", current.id);
        updated += 1;
      } else {
        // L'événement a été supprimé côté Outlook : on le recrée.
        const newId = await createEvent(accessToken, payload);
        await admin
          .from("outlook_calendar_events")
          .update({ outlook_event_id: newId, updated_at: new Date().toISOString() })
          .eq("id", current.id);
        created += 1;
      }
    } else {
      const newId = await createEvent(accessToken, payload);
      await admin.from("outlook_calendar_events").insert({
        user_id: userId,
        task_id: task.id,
        occurrence_key: key,
        outlook_event_id: newId,
      });
      created += 1;
    }
  }

  return { connected: true, created, updated, deleted };
}

export type SyncAllResult = {
  connected: boolean;
  synced: number;
  errors: number;
  /** Nombre de tâches concernant l'utilisateur ET comportant un planning. */
  considered: number;
  /** Nombre total de tâches non archivées examinées. */
  scanned: number;
  /** Premier message d'erreur rencontré (diagnostic). */
  firstError?: string;
};

function rowToTaskForSync(row: Record<string, unknown>): TaskForSync {
  return {
    id: row.id as string,
    projectName: (row.project_name as string) ?? "Tâche",
    description: (row.description as string | null) ?? null,
    company: (row.company as string | null) ?? null,
    domain: (row.domain as string | null) ?? null,
    projectedWork: ((row.projected_work as ProjectedWorkItem[] | null) ?? []).filter(
      (item) => item && typeof item.date === "string" && item.date.length > 0,
    ),
  };
}

/**
 * Synchronise toutes les tâches planifiées dont l'utilisateur est responsable.
 * Utile après la première connexion Outlook ou pour rattraper un retard de synchro.
 */
export async function syncAllTasksForUser(
  userId: string,
  identity: ServerUserIdentity,
  rows: Record<string, unknown>[],
): Promise<SyncAllResult> {
  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    return { connected: false, synced: 0, errors: 0, considered: 0, scanned: 0 };
  }

  let synced = 0;
  let errors = 0;
  let considered = 0;
  let scanned = 0;
  let firstError: string | undefined;

  for (const row of rows) {
    if (row.is_archived) continue;
    scanned += 1;
    if (!taskRowConcernsUser(row, identity)) continue;
    const projected = (row.projected_work as ProjectedWorkItem[] | null) ?? [];
    if (!projected.some((item) => item?.date)) continue;
    considered += 1;

    try {
      await syncTaskToOutlook(userId, rowToTaskForSync(row));
      synced += 1;
    } catch (e) {
      console.error("Outlook sync-all task error", row.id, e);
      errors += 1;
      if (!firstError) firstError = e instanceof Error ? e.message : String(e);
    }
  }

  return { connected: true, synced, errors, considered, scanned, firstError };
}
