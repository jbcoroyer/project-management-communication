"use client";

import { useMemo, useState } from "react";
import {
  AlarmClock,
  Bell,
  CalendarClock,
  CheckCircle2,
  Inbox as InboxIcon,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import type { Task } from "../../../lib/types";
import { DONE_COLUMN_NAME } from "../../../lib/workflowConstants";
import { useInAppNotifications } from "../../../lib/inAppNotificationsContext";

type InboxKind = "overdue" | "due-soon" | "validation" | "assigned";

type InboxItem = {
  id: string;
  kind: InboxKind;
  task: Task;
  when?: number;
};

const KIND_META: Record<InboxKind, { label: string; icon: typeof AlarmClock; tone: string }> = {
  overdue: { label: "En retard", icon: AlarmClock, tone: "text-[var(--danger)]" },
  "due-soon": { label: "Échéance < 48 h", icon: CalendarClock, tone: "text-[var(--warning)]" },
  validation: { label: "En validation", icon: ShieldCheck, tone: "text-[var(--accent)]" },
  assigned: { label: "Qui m'est assigné", icon: CheckCircle2, tone: "text-[color:var(--foreground)]/60" },
};

const FILTERS: { id: "all" | InboxKind; label: string }[] = [
  { id: "all", label: "Tout" },
  { id: "overdue", label: "Retards" },
  { id: "due-soon", label: "< 48 h" },
  { id: "validation", label: "En validation" },
  { id: "assigned", label: "Assignées" },
];

function parseDeadline(value: string): number | null {
  if (!value) return null;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : null;
}

export default function V2Inbox({
  tasks,
  currentUserName,
  now,
  onOpenTask,
}: {
  tasks: Task[];
  currentUserName?: string | null;
  now: number;
  onOpenTask: (taskId: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | InboxKind>("all");
  const { history } = useInAppNotifications();

  const items = useMemo<InboxItem[]>(() => {
    const me = currentUserName?.trim().toLowerCase();
    const mine = tasks.filter((task) => {
      if (task.isArchived || task.parentTaskId) return false;
      if (!me) return false;
      return task.admins.some((a) => a.trim().toLowerCase() === me);
    });

    const soonThreshold = now + 48 * 60 * 60 * 1000;
    const result: InboxItem[] = [];

    for (const task of mine) {
      const isDone = task.column === DONE_COLUMN_NAME;
      const deadlineTs = parseDeadline(task.deadline);

      if (!isDone && deadlineTs !== null && deadlineTs < now) {
        result.push({ id: `overdue-${task.id}`, kind: "overdue", task, when: deadlineTs });
        continue;
      }
      if (!isDone && deadlineTs !== null && deadlineTs >= now && deadlineTs <= soonThreshold) {
        result.push({ id: `due-${task.id}`, kind: "due-soon", task, when: deadlineTs });
        continue;
      }
      if (task.column === "En validation") {
        result.push({ id: `val-${task.id}`, kind: "validation", task });
        continue;
      }
      if (!isDone) {
        result.push({ id: `assigned-${task.id}`, kind: "assigned", task });
      }
    }

    const order: Record<InboxKind, number> = { overdue: 0, "due-soon": 1, validation: 2, assigned: 3 };
    return result.sort((a, b) => {
      if (order[a.kind] !== order[b.kind]) return order[a.kind] - order[b.kind];
      return (a.when ?? Infinity) - (b.when ?? Infinity);
    });
  }, [tasks, currentUserName, now]);

  const counts = useMemo(() => {
    const c: Record<InboxKind, number> = { overdue: 0, "due-soon": 0, validation: 0, assigned: 0 };
    for (const item of items) c[item.kind] += 1;
    return c;
  }, [items]);

  const filtered = filter === "all" ? items : items.filter((item) => item.kind === filter);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
      <section className="ui-surface rounded-2xl p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <InboxIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Ma boîte de réception</h2>
              <p className="text-xs text-[color:var(--foreground)]/55">
                {currentUserName ? `Priorités de ${currentUserName.split(" ")[0]}` : "Connectez-vous pour personnaliser"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => {
              const active = filter === f.id;
              const count = f.id === "all" ? items.length : counts[f.id];
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={[
                    "ui-transition rounded-lg px-2.5 py-1.5 text-xs font-semibold",
                    active
                      ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                      : "text-[color:var(--foreground)]/60 hover:bg-[var(--surface-soft)]",
                  ].join(" ")}
                >
                  {f.label}
                  <span className="ml-1 opacity-70">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-10 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-[var(--success)]" />
            <p className="mt-2 text-sm font-medium text-[var(--foreground)]">Boîte de réception au clair</p>
            <p className="mt-1 text-xs text-[color:var(--foreground)]/55">Aucune priorité en attente pour vous.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((item) => {
              const meta = KIND_META[item.kind];
              const Icon = meta.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onOpenTask(item.task.id)}
                    className="ui-transition flex w-full items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-left hover:border-[var(--line-strong)] hover:bg-[var(--surface-soft)]"
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${meta.tone}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                        {item.task.projectName || "Sans titre"}
                      </p>
                      <p className="truncate text-[11px] text-[color:var(--foreground)]/55">
                        {item.task.company} · {item.task.domain}
                        {item.task.deadline ? ` · échéance ${new Date(item.task.deadline).toLocaleDateString("fr-FR")}` : ""}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] font-semibold ${meta.tone}`}>
                      {meta.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="ui-surface rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-[color:var(--foreground)]/60">
            <Bell className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-[var(--foreground)]">Activité &amp; mentions</h2>
            <p className="text-xs text-[color:var(--foreground)]/55">Temps réel</p>
          </div>
        </div>

        {history.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-8 text-center text-xs text-[color:var(--foreground)]/55">
            Les changements du Kanban (assignations, échéances, colonnes) apparaîtront ici.
          </p>
        ) : (
          <ul className="space-y-2">
            {history.slice(0, 12).map((entry) => (
              <li
                key={entry.id}
                className={[
                  "rounded-xl border px-3 py-2.5",
                  entry.read
                    ? "border-[var(--line)] bg-[var(--surface)]"
                    : "border-[var(--line-strong)] bg-[var(--surface-soft)]",
                ].join(" ")}
              >
                <p className="text-xs font-semibold text-[var(--foreground)]">{entry.title}</p>
                {entry.body ? (
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[color:var(--foreground)]/60">{entry.body}</p>
                ) : null}
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-[color:var(--foreground)]/45">
                    {new Date(entry.at).toLocaleString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {entry.href ? (
                    <Link href={entry.href} className="text-[11px] font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]">
                      Ouvrir
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
