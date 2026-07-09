"use client";

import { useEffect, useRef } from "react";
import { getSupabaseBrowser } from "../lib/supabaseBrowser";
import { useCurrentUser } from "../lib/useCurrentUser";
import { deadlineDateOnly, daysFromTodayUtc, taskRowConcernsUser } from "../lib/taskConcernsUser";
import { kanbanHref } from "../lib/appVersion";
import { wasTaskMutatedLocally } from "../lib/taskMutatedLocally";
import type { InAppNotificationInput } from "../lib/inAppNotificationTypes";
import { DONE_COLUMN_NAME } from "../lib/workflowConstants";

type Push = (input: InAppNotificationInput) => void;

function projectName(row: Record<string, unknown>): string {
  const n = row.project_name;
  return typeof n === "string" && n.trim() ? n.trim() : "Tâche";
}

function dedupeKey(parts: string[]) {
  return `idena-inapp-notif:${parts.join(":")}`;
}

const REALTIME_STATUS_DEDUPE_TTL_MS = 6 * 60 * 60 * 1000;
const REALTIME_BOOT_GRACE_MS = 4_000;

function shouldDedupe(key: string, ttlMs: number): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return false;
    const t = Number(raw);
    if (!Number.isFinite(t) || Date.now() - t > ttlMs) {
      window.localStorage.removeItem(key);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function rememberDedupe(key: string) {
  try {
    window.localStorage.setItem(key, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export default function TaskRealtimeNotifications(props: { pushNotification: Push }) {
  const { pushNotification } = props;
  const { user, loading } = useCurrentUser();
  const supabase = getSupabaseBrowser();
  const pushRef = useRef(pushNotification);
  const userRef = useRef(user);
  const realtimeWarnedRef = useRef(false);
  const realtimeReadyAtRef = useRef(0);

  // Refs synchronisées via effect (jamais mutées pendant le render)
  useEffect(() => {
    pushRef.current = pushNotification;
  }, [pushNotification]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (loading || !user) return;

    const channel = supabase
      .channel("in-app-task-notifications")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload: {
          eventType: string;
          new?: Record<string, unknown>;
          old?: Record<string, unknown>;
        }) => {
          if (Date.now() - realtimeReadyAtRef.current < REALTIME_BOOT_GRACE_MS) return;

          const u = userRef.current;
          if (!u) return;

          if (payload.eventType === "DELETE") {
            return;
          }

          const newRow = payload.new;
          if (!newRow || typeof newRow !== "object") return;

          const id = newRow.id;
          const taskId = typeof id === "string" ? id : null;
          if (taskId && wasTaskMutatedLocally(taskId)) return;

          if (payload.eventType === "INSERT") {
            if (!taskRowConcernsUser(newRow, u)) return;
            const name = projectName(newRow);
            const dk = dedupeKey(["insert", taskId ?? ""]);
            if (shouldDedupe(dk, 15_000)) return;
            rememberDedupe(dk);
            pushRef.current({
              title: "Nouvelle tâche",
              body: `« ${name} » vous concerne.`,
              href: kanbanHref(window.location.pathname, taskId),
            });
            return;
          }

          if (payload.eventType === "UPDATE") {
            const oldRow = payload.old ?? {};
            if (taskId && wasTaskMutatedLocally(taskId)) return;

            const concernedNew = taskRowConcernsUser(newRow, u);
            const concernedOld = taskRowConcernsUser(oldRow, u);

            if (!concernedNew) return;

            const oldHasAssigneeFields =
              (typeof oldRow.admin === "string" && oldRow.admin.trim() !== "") ||
              (typeof oldRow.lane === "string" && oldRow.lane.trim() !== "");

            if (!concernedOld && concernedNew && oldHasAssigneeFields) {
              const dk = dedupeKey(["assign", taskId ?? ""]);
              if (shouldDedupe(dk, 15_000)) return;
              rememberDedupe(dk);
              pushRef.current({
                title: "Ajout au projet",
                body: `Vous suivez désormais « ${projectName(newRow)} ».`,
                href: kanbanHref(window.location.pathname, taskId),
              });
              return;
            }

            const oldDeadline =
              typeof oldRow.deadline === "string" ? oldRow.deadline : null;
            const newDeadline =
              typeof newRow.deadline === "string" ? newRow.deadline : null;
            if (oldDeadline !== newDeadline && (newDeadline || oldDeadline)) {
              const dk = dedupeKey(["deadline", taskId ?? "", newDeadline ?? ""]);
              if (shouldDedupe(dk, 10_000)) {
                /* skip */
              } else {
                rememberDedupe(dk);
                const label = newDeadline
                  ? `Nouvelle échéance : ${newDeadline.slice(0, 10)}`
                  : "Échéance retirée";
                pushRef.current({
                  title: `« ${projectName(newRow)} »`,
                  body: label,
                  href: kanbanHref(window.location.pathname, taskId),
                });
              }
            }

            const oldCol =
              typeof oldRow.column_id === "string" ? oldRow.column_id : null;
            const newCol =
              typeof newRow.column_id === "string" ? newRow.column_id : null;
            if (oldCol && newCol && oldCol !== newCol) {
              const dk = dedupeKey(["col", taskId ?? "", newCol]);
              if (!shouldDedupe(dk, 8000)) {
                rememberDedupe(dk);
                pushRef.current({
                  title: "Tâche déplacée",
                  body: `« ${projectName(newRow)} » → ${newCol}`,
                  href: kanbanHref(window.location.pathname, taskId),
                });
              }
            }
          }
        },
      )
      .subscribe((status: string, err?: Error) => {
        if (status === "SUBSCRIBED") {
          realtimeReadyAtRef.current = Date.now();
          return;
        }
        if (realtimeWarnedRef.current) return;
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          const realtimeDedupe = dedupeKey(["realtime-unavailable"]);
          if (shouldDedupe(realtimeDedupe, REALTIME_STATUS_DEDUPE_TTL_MS)) return;
          rememberDedupe(realtimeDedupe);
          realtimeWarnedRef.current = true;
          const detail = err?.message ? String(err.message) : "";
          pushRef.current({
            title: "Notifications temps réel",
            body: detail
              ? `Connexion interrompue : ${detail}. Vérifiez la réplication Realtime sur la table « tasks » (Supabase).`
              : "Impossible de recevoir les alertes Kanban en direct. Activez Realtime pour « tasks » et contrôlez les politiques RLS.",
          });
        }
      });

    return () => {
      realtimeWarnedRef.current = false;
      void supabase.removeChannel(channel);
    };
  }, [loading, supabase, user?.id]);

  useEffect(() => {
    if (loading || !user) return;

    const runDeadlineScan = async (showToasts: boolean) => {
      const u = userRef.current;
      if (!u) return;

      const { data, error } = await supabase
        .from("tasks")
        .select("id, project_name, deadline, admin, lane, column_id, is_archived")
        .eq("is_archived", false)
        .not("deadline", "is", null)
        .limit(800);

      if (error || !data) return;

      for (const row of data as Record<string, unknown>[]) {
        if (row.is_archived === true) continue;
        const col = typeof row.column_id === "string" ? row.column_id : "";
        if (col === DONE_COLUMN_NAME) continue;
        if (!taskRowConcernsUser(row, u)) continue;

        const d = deadlineDateOnly(row.deadline);
        if (!d) continue;

        const delta = daysFromTodayUtc(d);
        let title: string | null = null;
        let body: string | null = null;

        if (delta < 0) {
          title = "Échéance dépassée";
          body = `« ${projectName(row)} » était prévue le ${d}.`;
        } else if (delta === 0) {
          title = "Échéance aujourd'hui";
          body = `« ${projectName(row)} ».`;
        } else if (delta === 1) {
          title = "Échéance demain";
          body = `« ${projectName(row)} » (${d}).`;
        }

        if (!title || !body) continue;
        if (!showToasts) continue;

        const taskId = typeof row.id === "string" ? row.id : "";
        const dk = dedupeKey(["deadline-scan", taskId, d, title]);
        if (shouldDedupe(dk, 86_400_000)) continue;
        rememberDedupe(dk);

        pushRef.current({
          title,
          body,
          href: kanbanHref(window.location.pathname, taskId),
        });
      }
    };

    const id = window.setInterval(() => void runDeadlineScan(true), 30 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [loading, supabase, user?.id]);

  return null;
}
