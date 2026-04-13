"use client";

import { type CSSProperties } from "react";
import { motion } from "framer-motion";
import type { Task } from "../lib/types";
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  ListChecks,
  Pencil,
  Trash2,
} from "lucide-react";
import { adminBadgeClassFor, adminSolidColorFor, domainTagStyles } from "../lib/kanbanStyles";
import AdminAvatar from "./AdminAvatar";
import CompanyAvatar from "./CompanyAvatar";

function SubtaskBadge(props: { subtasks: Task[]; minimal?: boolean }) {
  const done = props.subtasks.filter((t) => t.column === "Terminé").length;
  const total = props.subtasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  if (props.minimal) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold tabular-nums text-[color:var(--foreground)]/55">
        <ListChecks className="h-2.5 w-2.5 shrink-0" />
        {done}/{total}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--foreground)]/65">
      <ListChecks className="h-3 w-3 shrink-0" />
      {done}/{total}
      <span
        className="ml-0.5 inline-block h-1.5 w-8 overflow-hidden rounded-full bg-[var(--line)]"
        aria-hidden
      >
        <span
          className="block h-full rounded-full bg-emerald-500"
          style={{ width: `${pct}%` }}
        />
      </span>
    </span>
  );
}

function PriorityBadge({ priority, dense }: { priority: Task["priority"]; dense?: boolean }) {
  const cls = {
    Haute: "border-rose-200 bg-rose-50 text-rose-700",
    Moyenne: "border-amber-200 bg-amber-50 text-amber-700",
    Basse: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }[priority] ?? "border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/65";

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border font-bold",
        dense ? "px-1 py-px text-[8px] leading-none" : "px-2 py-0.5 text-[10px]",
        cls,
      ].join(" ")}
    >
      {dense ? priority.slice(0, 1) : priority}
    </span>
  );
}

function CardBody(props: {
  task: Task;
  currentNow: number;
  onEdit: () => void;
  onDelete: () => void;
  variant: "full" | "compact" | "dense";
  interactive: boolean;
  isMyTask?: boolean;
  companyLogoUrl?: string | null;
}) {
  const { task, currentNow, onEdit, onDelete, interactive, isMyTask } = props;

  const isDone = task.column === "Terminé";
  const deadlineMs = task.deadline ? new Date(task.deadline + "T23:59:59").getTime() : 0;
  const isOverdue = !isDone && deadlineMs > 0 && currentNow > deadlineMs;
  const isUrgent48h =
    !isDone &&
    deadlineMs > 0 &&
    deadlineMs - currentNow <= 48 * 60 * 60 * 1000 &&
    deadlineMs >= currentNow;
  const domainClass = domainTagStyles[task.domain] ?? domainTagStyles.default;

  return (
    <>
      {/* ── Ligne 1 : Admins + boutons actions ── */}
      <div
        className={[
          "flex items-center justify-between gap-2",
          props.variant === "dense" ? "min-w-0" : "",
        ].join(" ")}
      >
        <div
          className={[
            "flex items-center gap-1.5",
            props.variant === "dense"
              ? "min-w-0 flex-1 flex-nowrap overflow-x-auto [scrollbar-width:none] max-w-full [&::-webkit-scrollbar]:hidden"
              : "flex-wrap",
          ].join(" ")}
        >
          {task.admins.map((admin) => (
            <span
              key={admin}
              className={[
                "inline-flex shrink-0 items-center rounded-full border font-semibold",
                props.variant === "dense"
                  ? "gap-0.5 px-1 py-px text-[8px]"
                  : "gap-1 px-2 py-0.5 text-[10px]",
                adminBadgeClassFor(admin),
                isMyTask && task.admins[0] === admin
                  ? props.variant === "dense"
                    ? "ring-1 ring-[var(--line-strong)]"
                    : "ring-1 ring-offset-1 ring-[var(--line-strong)]"
                  : "",
              ].join(" ")}
            >
              <AdminAvatar admin={admin} />
              {props.variant === "dense"
                ? admin.split(" ")[0]?.slice(0, 10) ?? admin
                : admin.split(" ")[0]}
            </span>
          ))}

          {/* Indicateurs d'état urgence / retard */}
          {isOverdue && (
            <span
              className={[
                "shrink-0 rounded-full bg-rose-100 font-bold uppercase text-rose-700",
                props.variant === "dense" ? "px-1 py-px text-[7px]" : "px-1.5 py-0.5 text-[9px] tracking-wide",
              ].join(" ")}
            >
              {props.variant === "dense" ? "ret." : "retard"}
            </span>
          )}
          {isUrgent48h && !isOverdue && (
            <span
              className={[
                "shrink-0 rounded-full bg-amber-100 font-bold uppercase text-amber-700",
                props.variant === "dense" ? "px-1 py-px text-[7px]" : "px-1.5 py-0.5 text-[9px] tracking-wide",
              ].join(" ")}
            >
              48h
            </span>
          )}
          {task.priority === "Haute" && (
            <span title="Priorité haute">
              <AlertTriangle
                className={props.variant === "dense" ? "h-2.5 w-2.5 text-amber-500" : "h-3 w-3 text-amber-500"}
              />
            </span>
          )}
          {isMyTask && (
            <span
              className={[
                "shrink-0 rounded-full bg-[color:var(--foreground)]/10 font-bold uppercase text-[color:var(--foreground)]/75",
                props.variant === "dense" ? "px-1 py-px text-[7px]" : "px-1.5 py-0.5 text-[9px] tracking-wide",
              ].join(" ")}
            >
              moi
            </span>
          )}
        </div>

        {/* Boutons d'action (hover) */}
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity duration-[220ms] group-hover:opacity-100">
          <div className="flex items-center gap-0.5 rounded-full border border-[var(--line)] bg-[var(--surface)]/90 p-0.5 shadow-sm">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className={[
                "inline-flex items-center justify-center rounded-full text-[color:var(--foreground)]/55 transition-colors",
                props.variant === "dense" ? "h-4 w-4" : "h-5 w-5",
                interactive ? "hover:bg-[var(--surface-soft)] hover:text-[color:var(--foreground)]/75" : "pointer-events-none",
              ].join(" ")}
              title="Modifier"
            >
              <Pencil className={props.variant === "dense" ? "h-2.5 w-2.5" : "h-3 w-3"} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className={[
                "inline-flex items-center justify-center rounded-full text-[color:var(--foreground)]/45 transition-colors",
                props.variant === "dense" ? "h-4 w-4" : "h-5 w-5",
                interactive ? "hover:bg-rose-50 hover:text-rose-600" : "pointer-events-none",
              ].join(" ")}
              title="Archiver"
            >
              <Trash2 className={props.variant === "dense" ? "h-2.5 w-2.5" : "h-3 w-3"} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Ligne 2 : Nom du projet ── */}
      <p
        className={[
          "line-clamp-2 pl-0.5 font-semibold leading-tight tracking-tight text-[var(--foreground)]",
          props.variant === "dense"
            ? "text-[13px] leading-snug"
            : props.variant === "compact"
              ? "text-[15px]"
              : "text-[17px]",
        ].join(" ")}
      >
        {task.projectName || "Projet sans titre"}
      </p>

      {props.variant === "compact" ? (
        <div className="flex min-w-0 items-center justify-between gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1">
            <PriorityBadge priority={task.priority} />
            <span
              className={[
                "inline-flex max-w-[7rem] truncate rounded border px-1 py-px text-[9px] font-semibold",
                domainClass,
              ].join(" ")}
            >
              {task.domain}
            </span>
          </div>
          {task.subtasks && task.subtasks.length > 0 && <SubtaskBadge subtasks={task.subtasks} />}
        </div>
      ) : props.variant === "dense" ? (
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1 text-[9px] text-[color:var(--foreground)]/60">
            <span className="inline-flex max-w-[5.5rem] items-center gap-0.5 truncate rounded border border-[var(--line)] bg-[var(--surface-soft)]/90 px-1 py-px">
              <CompanyAvatar
                name={task.company}
                logoUrl={props.companyLogoUrl}
                className="h-3 w-3 shrink-0 rounded-sm object-contain"
                fallbackClassName="flex h-3 w-3 shrink-0 items-center justify-center text-[color:var(--foreground)]/40"
                iconClassName="h-2.5 w-2.5"
              />
              <span className="truncate">{task.company}</span>
            </span>
            {task.deadline && (
              <span
                className={[
                  "inline-flex shrink-0 items-center gap-0.5 rounded border px-1 py-px",
                  isOverdue
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : isUrgent48h
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-[var(--line)] bg-[var(--surface-soft)]/80",
                ].join(" ")}
              >
                <CalendarDays className="h-2.5 w-2.5 shrink-0" />
                {task.deadline.length >= 10 ? task.deadline.slice(5) : task.deadline}
              </span>
            )}
            {(task.estimatedHours > 0 || task.estimatedDays > 0) && (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-[var(--line)] bg-[var(--surface-soft)]/80 px-1 py-px">
                <Clock3 className="h-2.5 w-2.5 shrink-0" />
                {task.estimatedHours > 0 ? `${task.estimatedHours}h` : `${task.estimatedDays}j`}
              </span>
            )}
            <span
              className={[
                "inline-flex max-w-[4.5rem] truncate rounded border px-1 py-px text-[8px] font-semibold leading-tight",
                domainClass,
              ].join(" ")}
            >
              {task.domain}
            </span>
            <PriorityBadge priority={task.priority} dense />
            {task.subtasks && task.subtasks.length > 0 && (
              <SubtaskBadge subtasks={task.subtasks} minimal />
            )}
          </div>
        </div>
      ) : (
        <>
          {/* ── Ligne 3 : Métadonnées ── */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[color:var(--foreground)]/65">
            <span className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--surface-soft)]/80 px-1.5 py-0.5">
              <CompanyAvatar
                name={task.company}
                logoUrl={props.companyLogoUrl}
                className="h-3.5 w-3.5 shrink-0 rounded-sm object-contain"
                fallbackClassName="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-[color:var(--foreground)]/40"
                iconClassName="h-3 w-3"
              />
              <span className="max-w-[100px] truncate">{task.company}</span>
            </span>
            {task.deadline && (
              <span
                className={[
                  "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5",
                  isOverdue
                    ? "border-rose-200 bg-rose-50 text-rose-700"
                    : isUrgent48h
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-[var(--line)] bg-[var(--surface-soft)]/80",
                ].join(" ")}
              >
                <CalendarDays className="h-3 w-3 shrink-0" />
                {task.deadline}
              </span>
            )}
            {(task.estimatedHours > 0 || task.estimatedDays > 0) && (
              <span className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--surface-soft)]/80 px-1.5 py-0.5 text-[color:var(--foreground)]/70">
                <Clock3 className="h-3 w-3 shrink-0" />
                {task.estimatedHours > 0 ? `${task.estimatedHours}h` : `${task.estimatedDays}j`}
              </span>
            )}
          </div>

          {/* ── Ligne 4 : Domaine + priorité + sous-tâches ── */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span
                className={[
                  "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
                  domainClass,
                ].join(" ")}
              >
                {task.domain}
              </span>
              <PriorityBadge priority={task.priority} />
            </div>
            {task.subtasks && task.subtasks.length > 0 && <SubtaskBadge subtasks={task.subtasks} />}
          </div>
        </>
      )}
    </>
  );
}

export function KanbanCardUI(props: {
  task: Task;
  currentNow: number;
  onArchive: () => void;
  onEdit: () => void;
  onDelete: () => void;
  variant?: "full" | "compact" | "dense";
  isOverlay?: boolean;
  isMyTask?: boolean;
  companyLogoUrl?: string | null;
  style?: CSSProperties;
}) {
  const { task, currentNow, onEdit, onDelete, isMyTask } = props;
  const variant = props.variant ?? "full";
  const isOverlay = props.isOverlay ?? false;

  const primaryAdmin = task.admins[0] ?? "";
  const adminColor = adminSolidColorFor(primaryAdmin);

  const borderLeft = variant === "dense" ? 3 : 4;

  return (
    <motion.article
      style={{
        ...props.style,
        borderLeftColor: adminColor,
        borderLeftWidth: borderLeft,
      }}
      layout={!isOverlay}
      initial={isOverlay ? false : { opacity: 0, y: 4 }}
      animate={isOverlay ? undefined : { opacity: 1, y: 0 }}
      transition={isOverlay ? undefined : { duration: 0.2 }}
      className={[
        "group relative flex flex-col border border-[var(--line)] text-xs text-[var(--foreground)] ui-transition",
        variant === "dense" ? "gap-1 rounded-xl p-2" : variant === "compact" ? "gap-1.5 rounded-2xl p-2.5" : "gap-2.5 rounded-2xl p-4",
        isMyTask ? "bg-[var(--surface)] shadow-[0_0_0_2px_var(--accent)]/20" : "bg-[var(--surface)]",
        isOverlay
          ? "pointer-events-none rotate-2 shadow-2xl ring-1 ring-[var(--line)]/40"
          : variant === "dense"
            ? "hover:border-[var(--line-strong)] hover:shadow-[0_8px_20px_rgba(20,17,13,0.1)]"
            : "hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:shadow-[0_16px_30px_rgba(20,17,13,0.12)]",
      ].join(" ")}
    >
      <CardBody
        task={task}
        currentNow={currentNow}
        onEdit={onEdit}
        onDelete={onDelete}
        variant={variant}
        interactive={!isOverlay}
        isMyTask={isMyTask}
        companyLogoUrl={props.companyLogoUrl}
      />
    </motion.article>
  );
}

export default function KanbanCard(props: {
  task: Task;
  currentNow: number;
  onArchive: () => void;
  onEdit: () => void;
  onDelete: () => void;
  variant?: "full" | "compact" | "dense";
  isMyTask?: boolean;
}) {
  return <KanbanCardUI {...props} />;
}
