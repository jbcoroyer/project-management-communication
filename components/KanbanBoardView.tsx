"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  LayoutGrid,
  ListTodo,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import { KanbanCardUI } from "./KanbanCard";
import AdminAvatar from "./AdminAvatar";
import type { Task, ColumnId, AdminId } from "../lib/types";
import type { ReferenceRecord } from "../lib/referenceData";
import {
  adminFilterPillClassFor,
  adminSolidColorFor,
  columnStyles,
} from "../lib/kanbanStyles";
import {
  loadCollapsedEventGroupIds,
  persistCollapsedEventGroupIds,
  toggleCollapsedEventGroup,
} from "../lib/eventGroupCollapse";
import { partitionTasksByEvent, sortTasksByDeadline } from "../lib/eventTaskGroups";

const COLUMN_META: Record<
  string,
  { icon: typeof ListTodo; subtitle: string }
> = {
  "À faire": { icon: ListTodo, subtitle: "À planifier" },
  "En cours": { icon: Clock3, subtitle: "En production" },
  "En validation": { icon: ShieldCheck, subtitle: "Contrôle qualité" },
  Terminé: { icon: CheckCircle2, subtitle: "Livré" },
};

const FALLBACK_META = { icon: ListTodo, subtitle: "Backlog" };

function DroppableColumn(props: {
  id: string;
  children: React.ReactNode;
  count: number;
  onAddTask?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: props.id });
  const meta = COLUMN_META[props.id] ?? FALLBACK_META;
  const Icon = meta.icon;
  const styles = columnStyles[props.id] ?? columnStyles["À faire"];

  return (
    <div className="flex min-w-[260px] flex-1 flex-col">
      <div
        className={[
          "mb-2 flex items-center justify-between rounded-2xl border border-[var(--line)] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
          styles.headerBg,
          styles.headerText,
        ].join(" ")}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0" />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em]">{props.id}</p>
            <p className="text-[9px] font-medium uppercase tracking-[0.12em] opacity-60">
              {meta.subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex min-w-[28px] items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-[11px] font-bold text-[color:var(--foreground)]/75">
            {props.count}
          </span>
          {props.onAddTask && (
            <button
              type="button"
              onClick={props.onAddTask}
              className="ui-transition inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface)]/70 text-[color:var(--foreground)]/55 hover:bg-[var(--surface-soft)] hover:text-[color:var(--foreground)]/75"
              title="Ajouter une tâche dans cette colonne"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={[
          "flex flex-1 flex-col gap-2 rounded-2xl border border-dashed p-2 transition-all duration-150",
          isOver
            ? "border-[var(--line-strong)] bg-[var(--surface-soft)]/50 shadow-[inset_0_0_0_2px_rgba(26,26,26,0.08)]"
            : "border-[var(--line)] bg-[var(--surface)]/70",
        ].join(" ")}
        style={{ minHeight: 140 }}
      >
        {props.children}
      </div>
    </div>
  );
}

function DraggableCard(props: {
  task: Task;
  now: number;
  companyLogoUrl?: string | null;
  onArchive: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpen: () => void;
  isMyTask?: boolean;
  cardRef?: (el: HTMLDivElement | null) => void;
  cardVariant?: "full" | "compact";
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: props.task.id,
  });

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        props.cardRef?.(el);
      }}
      {...listeners}
      {...attributes}
      onClick={props.onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          props.onOpen();
        }
      }}
      className={[
        "cursor-grab rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-300 active:cursor-grabbing",
        isDragging ? "opacity-25 scale-95" : "",
      ].join(" ")}
    >
      <KanbanCardUI
        task={props.task}
        currentNow={props.now}
        variant={props.cardVariant ?? "compact"}
        isMyTask={props.isMyTask}
        companyLogoUrl={props.companyLogoUrl}
        onArchive={props.onArchive}
        onEdit={props.onEdit}
        onDelete={props.onDelete}
      />
    </div>
  );
}

function DraggableEventGroup(props: {
  dragId: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: props.dragId,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={[
        "cursor-grab rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-300 active:cursor-grabbing",
        isDragging ? "opacity-55 scale-[0.99]" : "",
      ].join(" ")}
    >
      {props.children}
    </div>
  );
}

export default function KanbanBoardView(props: {
  tasks: Task[];
  columns: string[];
  admins: string[];
  companies: string[];
  companyRecords?: ReferenceRecord[];
  now: number;
  onMoveTask: (taskId: string, newColumn: ColumnId) => void;
  onOpenTask: (taskId: string) => void;
  onArchiveTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onAddTaskForColumn?: (column: ColumnId) => void;
  taskCardRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  lastFocusedTaskIdRef: React.MutableRefObject<string | null>;
  currentUserName?: string | null;
}) {
  const companyLogoMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const c of props.companyRecords ?? []) {
      map[c.name] = c.logoUrl ?? null;
    }
    return map;
  }, [props.companyRecords]);
  const [filterAdmin, setFilterAdmin] = useState<AdminId | "Tous">("Tous");
  const [filterCompany, setFilterCompany] = useState<string>("Toutes");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [cardDensity, setCardDensity] = useState<"compact" | "detailed">("detailed");
  const [collapsedEventIds, setCollapsedEventIds] = useState<Set<string>>(() =>
    loadCollapsedEventGroupIds(),
  );

  const toggleEventGroupCollapse = (eventId: string) => {
    setCollapsedEventIds((prev) => {
      const next = toggleCollapsedEventGroup(prev, eventId);
      persistCollapsedEventGroupIds(next);
      return next;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const filteredTasks = useMemo(
    () =>
      props.tasks.filter((task) => {
        if (filterAdmin !== "Tous" && !task.admins.includes(filterAdmin)) return false;
        if (filterCompany !== "Toutes" && task.company !== filterCompany) return false;
        return true;
      }),
    [props.tasks, filterAdmin, filterCompany],
  );

  /** Nombre de tâches par admin (pour les pills) */
  const adminCounts = useMemo(
    () =>
      props.admins.reduce<Record<string, number>>((acc, admin) => {
        acc[admin] = props.tasks.filter((t) => t.admins.includes(admin)).length;
        return acc;
      }, {}),
    [props.admins, props.tasks],
  );

  const activeTask = activeId
    ? (props.tasks.find((t) => t.id === activeId) ?? null)
    : null;
  const isGroupDrag = activeId?.startsWith("event:") ?? false;

  const groupedDragMap = useMemo(() => {
    const map: Record<string, { eventName: string; sourceColumn: ColumnId; taskIds: string[] }> = {};
    for (const col of props.columns) {
      const colTasks = filteredTasks.filter((t) => t.column === col);
      const { groups } = partitionTasksByEvent(colTasks);
      for (const [eventId, evTasks] of groups) {
        const dragId = `event:${col}:${eventId}`;
        map[dragId] = {
          eventName: evTasks[0]?.eventName ?? "Événement",
          sourceColumn: col as ColumnId,
          taskIds: evTasks.map((t) => t.id),
        };
      }
    }
    return map;
  }, [filteredTasks, props.columns]);

  const activeGroup = activeId ? groupedDragMap[activeId] : undefined;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const newColumn = over.id as ColumnId;
    const grouped = groupedDragMap[active.id as string];
    if (grouped) {
      if (grouped.sourceColumn === newColumn) return;
      grouped.taskIds.forEach((taskId) => props.onMoveTask(taskId, newColumn));
      return;
    }
    const task = props.tasks.find((t) => t.id === active.id);
    if (!task || task.column === newColumn) return;
    props.onMoveTask(active.id as string, newColumn);
  };

  const hasActiveFilters = filterAdmin !== "Tous" || filterCompany !== "Toutes";

  return (
    <div className="space-y-4">
      {/* ── Barre de filtres ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
        {/* Légende / filtre par collaborateur */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/50">
            Voir
          </span>

          {/* Pill "Tous" */}
          <button
            type="button"
            onClick={() => setFilterAdmin("Tous")}
            className={[
              "ui-transition inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-all",
              filterAdmin === "Tous"
                ? "border-[var(--line-strong)] bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                : "border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/65 hover:bg-[var(--surface)]",
            ].join(" ")}
          >
            Tous
            <span className="rounded-full bg-current/20 px-1.5 py-0.5 text-[9px]">
              {props.tasks.length}
            </span>
          </button>

          {/* Pills par admin */}
          {props.admins.map((admin) => {
            const isActive = filterAdmin === admin;
            const color = adminSolidColorFor(admin);
            const pillClass = adminFilterPillClassFor(admin);
            return (
              <button
                key={admin}
                type="button"
                onClick={() => setFilterAdmin(isActive ? "Tous" : (admin as AdminId))}
                style={isActive ? { borderColor: color, boxShadow: `0 0 0 2px ${color}33` } : {}}
                className={[
                  "ui-transition inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all",
                  pillClass,
                  isActive ? "ring-2" : "opacity-80 hover:opacity-100",
                ].join(" ")}
              >
                <AdminAvatar admin={admin as AdminId} size="sm" />
                <span>{admin.split(" ")[0]}</span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                  style={{ backgroundColor: `${color}22`, color }}
                >
                  {adminCounts[admin] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Séparateur */}
        <div className="h-5 w-px bg-[var(--line)] hidden sm:block" />

        {/* Filtre société */}
        <div className="flex items-center gap-2">
          <label className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/50">
            Société
          </label>
          <select
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-2.5 py-1.5 text-sm text-[var(--foreground)] focus:outline-none"
          >
            <option value="Toutes">Toutes</option>
            {props.companies.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
        </div>

        {/* Reset */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setFilterAdmin("Tous");
              setFilterCompany("Toutes");
            }}
            className="ui-transition inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--foreground)]/65 hover:bg-[var(--surface)]"
          >
            <X className="h-3 w-3" />
            Réinitialiser
          </button>
        )}

        <span className="ml-auto rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-2.5 py-1.5 text-[11px] font-semibold text-[color:var(--foreground)]/65">
          {filteredTasks.length} tâche{filteredTasks.length !== 1 ? "s" : ""}
        </span>
        <button
          type="button"
          onClick={() => setCardDensity((v) => (v === "compact" ? "detailed" : "compact"))}
          className="ui-transition inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-2.5 py-1.5 text-[11px] font-semibold text-[color:var(--foreground)]/70 hover:bg-[var(--surface)]"
          title="Basculer la densité d'affichage des cartes"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Vue {cardDensity === "compact" ? "compacte" : "détaillée"}
        </button>
      </div>

      {/* ── Tableau Kanban ── */}
      <section className="rounded-3xl border border-[var(--line)] bg-[var(--surface)]/85 p-5 shadow-[0_1px_2px_rgba(20,17,13,0.04)] backdrop-blur">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-2">
            {props.columns.map((col) => {
              const colTasks = filteredTasks
                .filter((t) => t.column === col)
                .sort(sortTasksByDeadline);
              const { standalone, groups } = partitionTasksByEvent(colTasks);
              return (
                <DroppableColumn
                  key={col}
                  id={col}
                  count={colTasks.length}
                  onAddTask={
                    props.onAddTaskForColumn
                      ? () => props.onAddTaskForColumn!(col as ColumnId)
                      : undefined
                  }
                >
                  {standalone.map((task) => (
                    <DraggableCard
                      key={task.id}
                      task={task}
                      now={props.now}
                      companyLogoUrl={companyLogoMap[task.company] ?? null}
                      isMyTask={
                        props.currentUserName
                          ? task.admins.includes(props.currentUserName)
                          : false
                      }
                      onArchive={() => props.onArchiveTask(task.id)}
                      onEdit={() => props.onEditTask(task)}
                      onDelete={() => props.onDeleteTask(task.id)}
                      onOpen={() => {
                        props.lastFocusedTaskIdRef.current = task.id;
                        props.onOpenTask(task.id);
                      }}
                      cardRef={(el) => {
                        props.taskCardRefs.current[task.id] = el;
                      }}
                      cardVariant={cardDensity === "compact" ? "compact" : "full"}
                    />
                  ))}
                  {groups.map(([eventId, evTasks]) => {
                    const collapsed = collapsedEventIds.has(eventId);
                    const eventDragId = `event:${col}:${eventId}`;
                    return (
                      <DraggableEventGroup key={eventId} dragId={eventDragId}>
                        <div
                          className={[
                            "rounded-2xl border border-[var(--line)]/85 bg-[var(--surface-soft)] p-2",
                            collapsed ? "" : "space-y-2",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-1.5 px-0.5 pb-1 pt-0.5">
                            <button
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={() => toggleEventGroupCollapse(eventId)}
                              className="ui-transition flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[color:var(--foreground)]/55 hover:bg-[var(--surface-soft)] hover:text-[color:var(--foreground)]/75"
                              title={collapsed ? "Déplier les tâches du salon" : "Replier (nom du salon seulement)"}
                              aria-expanded={!collapsed}
                            >
                              {collapsed ? (
                                <ChevronRight className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                            <Link
                              href={`/events/${eventId}`}
                              className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--foreground)]/75 hover:underline"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <CalendarRange className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{evTasks[0]?.eventName ?? "Événement"}</span>
                            </Link>
                            <span className="shrink-0 rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--foreground)]/55">
                              {evTasks.length} tâche{evTasks.length > 1 ? "s" : ""}
                            </span>
                          </div>
                          {!collapsed && (
                            <div className="space-y-2">
                              {evTasks.map((task) => (
                                <DraggableCard
                                  key={task.id}
                                  task={task}
                                  now={props.now}
                                  companyLogoUrl={companyLogoMap[task.company] ?? null}
                                  isMyTask={
                                    props.currentUserName
                                      ? task.admins.includes(props.currentUserName)
                                      : false
                                  }
                                  onArchive={() => props.onArchiveTask(task.id)}
                                  onEdit={() => props.onEditTask(task)}
                                  onDelete={() => props.onDeleteTask(task.id)}
                                  onOpen={() => {
                                    props.lastFocusedTaskIdRef.current = task.id;
                                    props.onOpenTask(task.id);
                                  }}
                                  cardRef={(el) => {
                                    props.taskCardRefs.current[task.id] = el;
                                  }}
                                  cardVariant={cardDensity === "compact" ? "compact" : "full"}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </DraggableEventGroup>
                    );
                  })}
                  {colTasks.length === 0 && (
                    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
                      <ListTodo className="h-8 w-8 text-[color:var(--foreground)]/20" />
                      <p className="text-xs text-[color:var(--foreground)]/45">Aucune tâche ici.</p>
                      <p className="text-[11px] text-[color:var(--foreground)]/35">
                        Créez-en une avec le bouton + ou la touche N.
                      </p>
                    </div>
                  )}
                </DroppableColumn>
              );
            })}
          </div>

          {typeof document !== "undefined" &&
            createPortal(
              <DragOverlay>
                {activeTask && (
                  <KanbanCardUI
                    task={activeTask}
                    currentNow={props.now}
                    variant={cardDensity === "compact" ? "compact" : "full"}
                    isOverlay
                    onArchive={() => {}}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                )}
                {isGroupDrag && activeGroup && (
                  <div className="rounded-2xl border border-[var(--line-strong)] bg-[var(--surface)] px-3 py-2 shadow-[0_16px_30px_rgba(20,17,13,0.12)]">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/60">
                      Déplacement du bloc
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-[var(--foreground)]">
                      {activeGroup.eventName}
                    </p>
                    <p className="text-[11px] text-[color:var(--foreground)]/60">
                      {activeGroup.taskIds.length} tâche{activeGroup.taskIds.length > 1 ? "s" : ""}
                    </p>
                  </div>
                )}
              </DragOverlay>,
              document.body,
            )}
        </DndContext>
      </section>
    </div>
  );
}
