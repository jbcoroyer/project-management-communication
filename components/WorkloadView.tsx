"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addWeeks,
  endOfWeek,
  format,
  isWithinInterval,
  parse,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
} from "lucide-react";
import AdminAvatar from "./AdminAvatar";
import type { Task, AdminId } from "../lib/types";
import type { ReferenceRecord } from "../lib/referenceData";
import { getSupabaseBrowser } from "../lib/supabaseBrowser";
import {
  adminBadgeClassFor,
  adminSolidColorFor,
  domainTagStyles,
} from "../lib/kanbanStyles";

const WEEKLY_CAPACITY = 35;

type AdminWorkload = {
  admin: AdminId;
  plannedHours: number;
  estimatedHours: number;
  unplannedEstimatedHours: number;
  socialHours: number;
  activeTasks: Task[];
  urgentCount: number;
  overdueCount: number;
};

type SocialPostForWorkload = {
  id: string;
  createdAt: string | null;
  scheduledAt: string;
  status: string;
  timeSpentHours: number;
  responsibleMemberId: string | null;
};

function getWeekInterval(anchor: Date) {
  const start = startOfWeek(anchor, { weekStartsOn: 1, locale: fr });
  const end = endOfWeek(anchor, { weekStartsOn: 1, locale: fr });
  return { start, end };
}

/** Heures d’estimation comptées dans la charge (hors catégorie Stand : voir ci‑dessous). */
function workloadEstimateContribution(task: Task): number {
  if (task.eventCategory === "Stand") return 0;
  if (task.estimatedHours > 0) return task.estimatedHours;
  if (task.estimatedDays > 0) return task.estimatedDays * 7;
  return 0;
}

function computeWorkload(
  tasks: Task[],
  socialPosts: SocialPostForWorkload[],
  adminMemberId: string | null,
  admin: AdminId,
  weekStart: Date,
  weekEnd: Date,
  now: number,
): AdminWorkload {
  const adminTasks = tasks.filter(
    (t) => !t.isArchived && t.admins.includes(admin) && t.column !== "Terminé",
  );

  let plannedHours = 0;
  let estimatedHours = 0;
  let unplannedEstimatedHours = 0;

  for (const task of adminTasks) {
    let plannedThisWeekForTask = 0;
    if (task.projectedWork?.length) {
      for (const item of task.projectedWork) {
        if (!item.date || item.hours <= 0) continue;
        const d = parse(item.date, "yyyy-MM-dd", new Date());
        if (isWithinInterval(d, { start: weekStart, end: weekEnd })) {
          plannedThisWeekForTask += item.hours;
        }
      }
    }
    plannedHours += plannedThisWeekForTask;
    const est = workloadEstimateContribution(task);
    estimatedHours += est;
    if (plannedThisWeekForTask === 0) {
      unplannedEstimatedHours += est;
    }
  }

  // Ajouter le "temps passé" des posts RS dans la charge de travail.
  const socialHours = socialPosts
    .filter(
      (p) =>
        p.status !== "Annulé" &&
        p.timeSpentHours > 0 &&
        Boolean(adminMemberId) &&
        p.responsibleMemberId === adminMemberId,
    )
    .filter((p) => {
      // On rattache la charge à la création du post (sinon un post planifié dans le futur
      // n'apparaît pas dans la charge actuelle malgré un temps déjà consommé).
      const referenceIso = p.createdAt ?? p.scheduledAt;
      const d = new Date(referenceIso);
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    })
    .reduce((sum, p) => sum + p.timeSpentHours, 0);

  plannedHours += socialHours;
  estimatedHours += socialHours;

  const DEADLINE_48H = 48 * 60 * 60 * 1000;
  const urgentCount = adminTasks.filter((t) => {
    const ms = t.deadline ? new Date(t.deadline + "T23:59:59").getTime() : 0;
    const isUrgent = ms > 0 && ms - now <= DEADLINE_48H && ms >= now;
    return t.priority === "Haute" || isUrgent;
  }).length;

  const overdueCount = adminTasks.filter((t) => {
    const ms = t.deadline ? new Date(t.deadline + "T23:59:59").getTime() : 0;
    return ms > 0 && now > ms;
  }).length;

  return {
    admin,
    plannedHours,
    estimatedHours,
    unplannedEstimatedHours,
    socialHours,
    activeTasks: adminTasks,
    urgentCount,
    overdueCount,
  };
}

function LoadBar(props: { hours: number; capacity: number; color: string }) {
  const pct = Math.min((props.hours / props.capacity) * 100, 100);
  const overflow = props.hours > props.capacity;
  const barColor =
    overflow ? "#e11d48" : pct >= 90 ? "#f59e0b" : pct >= 70 ? "#f97316" : props.color;

  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-soft)]">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: barColor }}
      />
    </div>
  );
}

function StatusBadge(props: { hours: number }) {
  const pct = (props.hours / WEEKLY_CAPACITY) * 100;
  if (pct > 100)
    return (
      <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">
        Surchargé
      </span>
    );
  if (pct >= 90)
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
        Presque plein
      </span>
    );
  if (pct >= 50)
    return (
      <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700">
        Chargé
      </span>
    );
  if (pct > 0)
    return (
      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
        Disponible
      </span>
    );
  return (
    <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-0.5 text-[10px] font-semibold text-[color:var(--foreground)]/50">
      Libre
    </span>
  );
}

function TaskRow(props: { task: Task; now: number }) {
  const { task, now } = props;
  const deadlineMs = task.deadline ? new Date(task.deadline + "T23:59:59").getTime() : 0;
  const isOverdue = deadlineMs > 0 && now > deadlineMs;
  const isUrgent =
    deadlineMs > 0 && !isOverdue && deadlineMs - now <= 48 * 60 * 60 * 1000;
  const domainClass = domainTagStyles[task.domain] ?? domainTagStyles.default;

  return (
    <div
      className={[
        "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm",
        isOverdue
          ? "border-rose-200 bg-rose-50/50"
          : isUrgent
            ? "border-amber-200 bg-amber-50/30"
            : "border-[var(--line)] bg-[var(--surface)]",
      ].join(" ")}
    >
      {/* Priorité */}
      <div
        className={[
          "h-7 w-1 shrink-0 rounded-full",
          isOverdue
            ? "bg-rose-500"
            : task.priority === "Haute"
              ? "bg-amber-400"
              : "bg-[var(--line-strong)]",
        ].join(" ")}
      />

      {/* Nom du projet */}
      <div className="min-w-0 flex-1">
        {task.parentTaskId ? (
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--foreground)]/45">
            Sous-tâche
          </p>
        ) : null}
        <p className="truncate text-base font-semibold text-[var(--foreground)]">
          {task.projectName || "Projet sans titre"}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <span
            className={[
              "rounded-md border px-1.5 py-0.5 text-[9px] font-semibold",
              domainClass,
            ].join(" ")}
          >
            {task.domain}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-[color:var(--foreground)]/55">
            <Building2 className="h-3 w-3" />
            {task.company}
          </span>
        </div>
      </div>

      {/* Colonne */}
      <span className="hidden rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--foreground)]/65 sm:inline">
        {task.column}
      </span>

      {/* Deadline */}
      {task.deadline && (
        <span
          className={[
            "hidden items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium sm:inline-flex",
            isOverdue
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : isUrgent
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/65",
          ].join(" ")}
        >
          <CalendarDays className="h-3 w-3 shrink-0" />
          {task.deadline}
        </span>
      )}

      {/* Heures estimées */}
      {(task.estimatedHours > 0 || task.estimatedDays > 0) && (
        <span className="flex items-center gap-1 text-[11px] text-[color:var(--foreground)]/55">
          <Clock className="h-3 w-3 shrink-0" />
          {task.estimatedHours > 0
            ? `${task.estimatedHours}h`
            : `${task.estimatedDays}j`}
        </span>
      )}

      {/* Urgence */}
      {(isOverdue || task.priority === "Haute") && (
        <AlertTriangle
          className={[
            "h-4 w-4 shrink-0",
            isOverdue ? "text-rose-500" : "text-amber-500",
          ].join(" ")}
        />
      )}
    </div>
  );
}

function AdminCard(props: {
  workload: AdminWorkload;
  now: number;
  useEstimated: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { workload, now, useEstimated } = props;
  const { admin, plannedHours, estimatedHours, unplannedEstimatedHours, socialHours, activeTasks, urgentCount, overdueCount } = workload;
  const plannedTaskHours = Math.max(plannedHours - socialHours, 0);

  const displayHours = useEstimated
    ? estimatedHours
    : plannedHours + unplannedEstimatedHours > 0
      ? plannedHours + unplannedEstimatedHours
      : estimatedHours;

  const color = adminSolidColorFor(admin);
  const pct = Math.round((displayHours / WEEKLY_CAPACITY) * 100);
  const badgeClass = adminBadgeClassFor(admin);

  // Trier : En cours > Haute priorité > deadline proche > le reste
  const sortedTasks = [...activeTasks].sort((a, b) => {
    const score = (t: Task) => {
      let s = 0;
      if (t.column === "En cours") s += 100;
      if (t.priority === "Haute") s += 50;
      const ms = t.deadline ? new Date(t.deadline + "T23:59:59").getTime() : 0;
      if (ms > 0 && ms - now < 7 * 24 * 60 * 60 * 1000) s += 30;
      return s;
    };
    return score(b) - score(a);
  });

  return (
    <div className="ui-surface overflow-hidden rounded-2xl">
      {/* Barre de couleur admin en haut */}
      <div className="h-1 w-full" style={{ backgroundColor: color }} />

      <div className="p-5">
        {/* En-tête : admin + statut */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AdminAvatar admin={admin} size="md" />
            <div>
              <h3 className="font-semibold text-[var(--foreground)]">{admin}</h3>
              <p className="text-[11px] text-[color:var(--foreground)]/55">
                {activeTasks.length} tâche{activeTasks.length !== 1 ? "s" : ""} actives
              </p>
            </div>
          </div>
          <StatusBadge hours={displayHours} />
        </div>

        {/* Barre de charge */}
        <div className="mb-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-[color:var(--foreground)]/70">
              Charge hebdomadaire
              {plannedHours === 0 && estimatedHours > 0 && (
                <span className="ml-1 text-[10px] text-[color:var(--foreground)]/40">(estimation)</span>
              )}
            </span>
            <span className="font-bold" style={{ color: pct > 100 ? "#e11d48" : color }}>
              {displayHours.toFixed(1)}h / {WEEKLY_CAPACITY}h
              <span className="ml-1 text-[color:var(--foreground)]/50">({pct}%)</span>
            </span>
          </div>
          <LoadBar hours={displayHours} capacity={WEEKLY_CAPACITY} color={color} />
          <p className="mt-1.5 text-[11px] text-[color:var(--foreground)]/55">
            Tâches planifiées: <strong>{plannedTaskHours.toFixed(1)}h</strong>
            {" · "}
            Posts RS: <strong>{socialHours.toFixed(1)}h</strong>
            {" · "}
            Tâches non planifiées: <strong>{unplannedEstimatedHours.toFixed(1)}h</strong>
            {" · "}
            Total: <strong>{displayHours.toFixed(1)}h</strong>
          </p>
        </div>

        {/* Compteurs urgences / retards */}
        <div className="mb-4 flex flex-wrap gap-2">
          {urgentCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
              <AlertTriangle className="h-3 w-3" />
              {urgentCount} urgente{urgentCount > 1 ? "s" : ""}
            </span>
          )}
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">
              <AlertTriangle className="h-3 w-3" />
              {overdueCount} en retard
            </span>
          )}
          {urgentCount === 0 && overdueCount === 0 && (
            <span className="text-[11px] text-[color:var(--foreground)]/40">
              Aucune urgence
            </span>
          )}

          {/* Badge admin (couleur) */}
          <span
            className={[
              "ml-auto inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
              badgeClass,
            ].join(" ")}
          >
            <AdminAvatar admin={admin} />
            <span className="ml-1">{admin.split(" ")[0]}</span>
          </span>
        </div>

        {/* Bouton dépliage */}
        {activeTasks.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="ui-transition flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] py-2 text-xs font-semibold text-[color:var(--foreground)]/65 hover:bg-[var(--surface)]"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                Masquer les tâches
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                Voir les {activeTasks.length} tâche{activeTasks.length !== 1 ? "s" : ""}
              </>
            )}
          </button>
        )}
      </div>

      {/* Liste des tâches (accordéon) */}
      {expanded && (
        <div className="border-t border-[var(--line)] bg-[var(--surface-soft)]/50 px-5 pb-5 pt-4">
          <div className="space-y-2">
            {sortedTasks.map((task) => (
              <TaskRow key={task.id} task={task} now={now} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkloadView(props: {
  tasks: Task[];
  admins: string[];
  adminRecords: ReferenceRecord[];
  now: number;
}) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [useEstimated, setUseEstimated] = useState(false);
  const [socialPosts, setSocialPosts] = useState<SocialPostForWorkload[]>([]);

  const upsertSocialPost = useMemo(
    () => (nextPost: SocialPostForWorkload) => {
      setSocialPosts((prev) => {
        const index = prev.findIndex((post) => post.id === nextPost.id);
        if (index === -1) {
          return [...prev, nextPost].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
        }
        const next = [...prev];
        next[index] = nextPost;
        return next.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
      });
    },
    [],
  );

  const { start: weekStart, end: weekEnd } = useMemo(
    () => getWeekInterval(anchorDate),
    [anchorDate],
  );

  useEffect(() => {
    let active = true;
    const loadSocialPosts = async () => {
      const { data, error } = await supabase
        .from("social_posts")
        .select("id,created_at,scheduled_at,status,time_spent_hours,responsible_member_id")
        .order("scheduled_at", { ascending: true })
        .gt("time_spent_hours", 0)
        .limit(500);
      if (error) {
        if (!active) return;
        setSocialPosts([]);
        return;
      }
      if (!active) return;
      const rows = (data ?? []) as unknown as Array<{
        id: string;
        created_at: string | null;
        scheduled_at: string;
        status: string;
        time_spent_hours: number | null;
        responsible_member_id: string | null;
      }>;
      setSocialPosts(
        rows.map((r) => ({
          id: r.id,
          createdAt: r.created_at ?? null,
          scheduledAt: r.scheduled_at,
          status: r.status,
          timeSpentHours: Number(r.time_spent_hours ?? 0) || 0,
          responsibleMemberId: r.responsible_member_id ?? null,
        })),
      );
    };

    const loadSocialPostById = async (id: string) => {
      const { data, error } = await supabase
        .from("social_posts")
        .select("id,created_at,scheduled_at,status,time_spent_hours,responsible_member_id")
        .eq("id", id)
        .maybeSingle();
      if (!active || error) return;
      if (!data) {
        setSocialPosts((prev) => prev.filter((post) => post.id !== id));
        return;
      }
      const row = data as {
        id: string;
        created_at: string | null;
        scheduled_at: string;
        status: string;
        time_spent_hours: number | null;
        responsible_member_id: string | null;
      };
      upsertSocialPost({
        id: row.id,
        createdAt: row.created_at ?? null,
        scheduledAt: row.scheduled_at,
        status: row.status,
        timeSpentHours: Number(row.time_spent_hours ?? 0) || 0,
        responsibleMemberId: row.responsible_member_id ?? null,
      });
    };

    void loadSocialPosts();

    const channel = supabase
      .channel("social-posts-workload-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "social_posts" },
        (payload: { eventType?: string; old?: { id?: string }; new?: unknown }) => {
        if (payload.eventType === "DELETE") {
          const deletedId = payload.old?.id as string | undefined;
          if (!deletedId) return;
          setSocialPosts((prev) => prev.filter((post) => post.id !== deletedId));
          return;
        }

        const rowId =
          typeof payload.new === "object" && payload.new !== null && "id" in payload.new
            ? String((payload.new as { id?: string }).id ?? "")
            : "";
        if (!rowId) return;
        void loadSocialPostById(rowId);
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, upsertSocialPost]);

  const workloads = useMemo(
    () =>
      props.admins.map((admin) => {
        const adminMemberId = props.adminRecords.find((r) => r.name === admin)?.id ?? null;
        return computeWorkload(props.tasks, socialPosts, adminMemberId, admin as AdminId, weekStart, weekEnd, props.now);
      }),
    [props.tasks, props.admins, props.adminRecords, weekStart, weekEnd, props.now, socialPosts],
  );

  const totalActiveTasks = workloads.reduce((s, w) => s + w.activeTasks.length, 0);
  const totalUrgent = workloads.reduce((s, w) => s + w.urgentCount, 0);
  const totalOverdue = workloads.reduce((s, w) => s + w.overdueCount, 0);

  const isCurrentWeek =
    format(weekStart, "yyyy-ww") === format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-ww");

  return (
    <div className="space-y-5">
      {/* ── En-tête ── */}
      <header className="ui-surface flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
        <div>
          <h2 className="ui-heading text-3xl font-semibold text-[var(--foreground)]">
            Charge de l&apos;équipe
          </h2>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/65">
            Capacité de {WEEKLY_CAPACITY}h par personne et par semaine.
          </p>
        </div>

        {/* Stats globales */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-center">
            <p className="text-xl font-bold text-[var(--foreground)]">{totalActiveTasks}</p>
            <p className="text-[10px] uppercase tracking-wide text-[color:var(--foreground)]/55">
              tâches actives
            </p>
          </div>
          {totalUrgent > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center">
              <p className="text-xl font-bold text-amber-700">{totalUrgent}</p>
              <p className="text-[10px] uppercase tracking-wide text-amber-600">urgentes</p>
            </div>
          )}
          {totalOverdue > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-center">
              <p className="text-xl font-bold text-rose-700">{totalOverdue}</p>
              <p className="text-[10px] uppercase tracking-wide text-rose-600">en retard</p>
            </div>
          )}
        </div>
      </header>

      {/* ── Navigation semaine ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAnchorDate((d) => subWeeks(d, 1))}
            className="ui-transition flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] hover:bg-[var(--surface)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="min-w-[220px] text-center">
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {format(weekStart, "d MMMM", { locale: fr })} — {format(weekEnd, "d MMMM yyyy", { locale: fr })}
            </p>
            {isCurrentWeek && (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--foreground)]/50">
                Semaine en cours
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setAnchorDate((d) => addWeeks(d, 1))}
            className="ui-transition flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] hover:bg-[var(--surface)]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {!isCurrentWeek && (
            <button
              type="button"
              onClick={() => setAnchorDate(new Date())}
              className="ui-transition rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-semibold text-[color:var(--foreground)]/70 hover:bg-[var(--surface)]"
            >
              Aujourd&apos;hui
            </button>
          )}
        </div>

        {/* Toggle mode calcul */}
        <div className="flex items-center gap-2 text-xs text-[color:var(--foreground)]/60">
          <span>Afficher :</span>
          <div className="flex rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-0.5">
            <button
              type="button"
              onClick={() => setUseEstimated(false)}
              className={[
                "rounded-md px-2.5 py-1 text-xs font-semibold transition",
                !useEstimated
                  ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                  : "text-[color:var(--foreground)]/60 hover:bg-[var(--surface)]",
              ].join(" ")}
            >
              Planning
            </button>
            <button
              type="button"
              onClick={() => setUseEstimated(true)}
              className={[
                "rounded-md px-2.5 py-1 text-xs font-semibold transition",
                useEstimated
                  ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
                  : "text-[color:var(--foreground)]/60 hover:bg-[var(--surface)]",
              ].join(" ")}
            >
              Estimation
            </button>
          </div>
          <span className="text-[10px] text-[color:var(--foreground)]/40">
            {useEstimated
              ? "Total estimé sur l'ensemble des tâches"
              : "Heures planifiées dans le calendrier cette semaine"}
          </span>
        </div>
      </div>

      {/* ── Grille des collaborateurs ── */}
      <div className="grid gap-4 md:grid-cols-2">
        {workloads.map((workload) => (
          <AdminCard
            key={workload.admin}
            workload={workload}
            now={props.now}
            useEstimated={useEstimated}
          />
        ))}
      </div>

      {props.admins.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--line)] py-16 text-center">
          <p className="text-sm text-[color:var(--foreground)]/45">
            Aucun collaborateur trouvé.
          </p>
        </div>
      )}
    </div>
  );
}
