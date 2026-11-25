"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Archive,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  FolderInput,
  LayoutGrid,
  ListTodo,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
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
import { folderTaskIdsNeedingMove } from "../lib/folderBulkMove";
import { copyText } from "../lib/copyText";
import { ContextMenu, useContextMenu, type ContextMenuItem } from "./ui/ContextMenu";

/** Au-dessus de ce seuil, les cartes passent en mode compact (même en « vue détaillée »). */
const KANBAN_AUTO_COMPACT_MIN = 8;
/** Colonnes très remplies : cartes encore plus denses. */
const KANBAN_DENSE_MIN = 14;
/** Soft-cap DOM : au-delà, « Voir plus » pour éviter de monter des centaines de cartes. */
const KANBAN_COLUMN_SOFT_CAP = 40;

type KanbanCardDisplayMode = "full" | "compact" | "dense";

function resolveKanbanCardDisplayMode(
  density: "compact" | "detailed",
  columnTaskCount: number,
): KanbanCardDisplayMode {
  const many = columnTaskCount >= KANBAN_AUTO_COMPACT_MIN;
  const veryMany = columnTaskCount >= KANBAN_DENSE_MIN;

  if (density === "compact") {
    return veryMany ? "dense" : "compact";
  }
  if (!many) return "full";
  if (veryMany) return "dense";
  return "compact";
}

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
  /** Colonne chargée : espacement vertical réduit entre les cartes */
  tightList?: boolean;
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
          "flex flex-1 flex-col rounded-2xl border border-dashed transition-all duration-150",
          props.tightList ? "gap-1 p-1.5" : "gap-2 p-2",
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
  columns: string[];
  companyLogoUrl?: string | null;
  onArchive: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpen: () => void;
  onMove: (column: ColumnId) => void;
  isMyTask?: boolean;
  cardRef?: (el: HTMLDivElement | null) => void;
  cardVariant?: KanbanCardDisplayMode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: props.task.id,
  });
  const { position, close, triggerProps, consumeClickSuppression } = useContextMenu();

  const menuItems: ContextMenuItem[] = [
    {
      id: "open",
      label: "Ouvrir",
      icon: <ExternalLink className="h-3.5 w-3.5" />,
      onSelect: props.onOpen,
    },
    {
      id: "edit",
      label: "Modifier",
      icon: <Pencil className="h-3.5 w-3.5" />,
      onSelect: props.onEdit,
    },
    {
      id: "copy",
      label: "Copier le titre",
      icon: <Copy className="h-3.5 w-3.5" />,
      onSelect: () => {
        void copyText(props.task.projectName || "Projet sans titre", "Titre copié");
      },
    },
    { id: "sep-move", type: "separator" },
    { id: "move-label", type: "label", label: "Déplacer vers" },
    ...props.columns.map((col) => ({
      id: `move-${col}`,
      label: col,
      disabled: col === props.task.column,
      onSelect: () => props.onMove(col as ColumnId),
    })),
    { id: "sep-danger", type: "separator" },
    {
      id: "archive",
      label: "Archiver",
      icon: <Archive className="h-3.5 w-3.5" />,
      onSelect: props.onArchive,
    },
    {
      id: "delete",
      label: "Supprimer",
      icon: <Trash2 className="h-3.5 w-3.5" />,
      danger: true,
      onSelect: props.onDelete,
    },
  ];

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        props.cardRef?.(el);
      }}
      data-task-id={props.task.id}
      {...listeners}
      {...attributes}
      {...triggerProps}
      onClick={() => {
        if (consumeClickSuppression()) return;
        props.onOpen();
      }}
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
        variant={props.cardVariant ?? "compact"}
        isMyTask={props.isMyTask}
        companyLogoUrl={props.companyLogoUrl}
        onArchive={props.onArchive}
        onEdit={props.onEdit}
        onDelete={props.onDelete}
      />
      <ContextMenu
        position={position}
        items={menuItems}
        onClose={close}
        ariaLabel={`Actions tâche ${props.task.projectName || ""}`}
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

function FolderGroupBlock(props: {
  dragId: string;
  column: string;
  columns: string[];
  collapsed: boolean;
  tightColumn: boolean;
  eventId: string;
  sample?: Task;
  taskCount: number;
  folderMenuKey: string;
  folderMoveOpen: boolean;
  onToggleCollapse: () => void;
  onToggleFolderMoveMenu: () => void;
  onMoveEntireFolder: (column: ColumnId) => void;
  onCopyFolderName: () => void;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { position, close, triggerProps, consumeClickSuppression } = useContextMenu();
  const salonHref = props.sample?.salonId
    ? `/v3/salons/${props.sample.salonId}`
    : `/v3/salons`;
  const folderLabel = props.sample?.salonName ?? props.sample?.eventName ?? "Salon";
  const canBulkMove = Boolean(props.sample && (props.sample.salonId || props.sample.eventId));

  const menuItems: ContextMenuItem[] = [
    {
      id: "open-salon",
      label: "Ouvrir le salon",
      icon: <ExternalLink className="h-3.5 w-3.5" />,
      onSelect: () => router.push(salonHref),
    },
    {
      id: "toggle",
      label: props.collapsed ? "Déplier" : "Replier",
      icon: props.collapsed ? (
        <ChevronRight className="h-3.5 w-3.5" />
      ) : (
        <ChevronDown className="h-3.5 w-3.5" />
      ),
      onSelect: props.onToggleCollapse,
    },
    {
      id: "copy-name",
      label: "Copier le nom",
      icon: <Copy className="h-3.5 w-3.5" />,
      onSelect: props.onCopyFolderName,
    },
  ];

  if (canBulkMove) {
    menuItems.push(
      { id: "sep-move", type: "separator" },
      { id: "move-label", type: "label", label: "Tout déplacer vers" },
      ...props.columns.map((targetCol) => ({
        id: `folder-move-${targetCol}`,
        label: targetCol,
        disabled: targetCol === props.column,
        onSelect: () => props.onMoveEntireFolder(targetCol as ColumnId),
      })),
    );
  }

  return (
    <DraggableEventGroup dragId={props.dragId}>
      <div
        {...triggerProps}
        onClickCapture={(e) => {
          if (consumeClickSuppression()) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        className={[
          "rounded-2xl border border-[var(--line)]/85 bg-[var(--surface-soft)]",
          props.tightColumn ? "p-1.5" : "p-2",
          props.collapsed ? "" : props.tightColumn ? "space-y-1" : "space-y-2",
        ].join(" ")}
      >
        <div className="flex items-center gap-1.5 px-0.5 pb-1 pt-0.5">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => props.onToggleCollapse()}
            className="ui-transition flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[color:var(--foreground)]/55 hover:bg-[var(--surface-soft)] hover:text-[color:var(--foreground)]/75"
            title={
              props.collapsed
                ? "Déplier les tâches du salon"
                : "Replier (nom du salon seulement)"
            }
            aria-expanded={!props.collapsed}
          >
            {props.collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <Link
            href={salonHref}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[color:var(--foreground)]/75 hover:underline"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <CalendarRange className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{folderLabel}</span>
          </Link>
          <span className="shrink-0 rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--foreground)]/55">
            {props.taskCount} tâche{props.taskCount > 1 ? "s" : ""}
          </span>
          {canBulkMove && (
            <div className="relative shrink-0">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  props.onToggleFolderMoveMenu();
                }}
                className="ui-transition flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[color:var(--foreground)]/55 hover:bg-[var(--surface-soft)] hover:text-[color:var(--foreground)]/75"
                title="Déplacer tout le dossier vers une colonne"
                aria-haspopup="menu"
                aria-expanded={props.folderMoveOpen}
              >
                <FolderInput className="h-3.5 w-3.5" />
              </button>
              {props.folderMoveOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1 shadow-[0_12px_28px_rgba(20,17,13,0.12)]"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/45">
                    Tout déplacer vers
                  </p>
                  {props.columns.map((targetCol) => (
                    <button
                      key={targetCol}
                      type="button"
                      role="menuitem"
                      disabled={targetCol === props.column}
                      onClick={() => props.onMoveEntireFolder(targetCol as ColumnId)}
                      className={[
                        "ui-transition flex w-full items-center rounded-lg px-2 py-1.5 text-left text-[12px] font-medium",
                        targetCol === props.column
                          ? "cursor-default text-[color:var(--foreground)]/35"
                          : "text-[color:var(--foreground)]/80 hover:bg-[var(--surface-soft)]",
                      ].join(" ")}
                    >
                      {targetCol}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        {props.children}
      </div>
      <ContextMenu
        position={position}
        items={menuItems}
        onClose={close}
        ariaLabel={`Actions dossier ${folderLabel}`}
      />
    </DraggableEventGroup>
  );
}

export default function KanbanBoardView(props: {
  tasks: Task[];
  columns: string[];
  admins: string[];
  companies: string[];
  companyRecords?: ReferenceRecord[];
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
  const defaultFilterAdmin = useMemo((): AdminId | "Tous" => {
    if (props.currentUserName && props.admins.includes(props.currentUserName)) {
      return props.currentUserName as AdminId;
    }
    return "Tous";
  }, [props.currentUserName, props.admins]);

  const filterTouchedRef = useRef(false);
  const [filterAdmin, setFilterAdminState] = useState<AdminId | "Tous">(() => defaultFilterAdmin);

  const setFilterAdmin = (value: AdminId | "Tous") => {
    filterTouchedRef.current = true;
    setFilterAdminState(value);
  };

  useEffect(() => {
    if (filterTouchedRef.current) return;
    if (defaultFilterAdmin !== "Tous") setFilterAdminState(defaultFilterAdmin);
  }, [defaultFilterAdmin]);
  const [filterCompany, setFilterCompany] = useState<string>("Toutes");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [cardDensity, setCardDensity] = useState<"compact" | "detailed">("detailed");
  const [expandedColumns, setExpandedColumns] = useState<Set<string>>(() => new Set());
  const [collapsedEventIds, setCollapsedEventIds] = useState<Set<string>>(() =>
    loadCollapsedEventGroupIds(),
  );
  /** Menu « déplacer tout le dossier » ouvert pour ce groupId (salon:… / event:…). */
  const [folderMoveMenuId, setFolderMoveMenuId] = useState<string | null>(null);

  const toggleEventGroupCollapse = (eventId: string) => {
    setCollapsedEventIds((prev) => {
      const next = toggleCollapsedEventGroup(prev, eventId);
      persistCollapsedEventGroupIds(next);
      return next;
    });
  };

  const moveEntireFolder = (sample: Task, column: ColumnId) => {
    const target = sample.salonId
      ? ({ kind: "salon", salonId: sample.salonId } as const)
      : sample.eventId
        ? ({ kind: "event", eventId: sample.eventId } as const)
        : null;
    if (!target) return;
    const ids = folderTaskIdsNeedingMove(props.tasks, target, column);
    for (const id of ids) props.onMoveTask(id, column);
    setFolderMoveMenuId(null);
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

  const overlayDisplayMode: KanbanCardDisplayMode = activeTask
    ? resolveKanbanCardDisplayMode(
        cardDensity,
        filteredTasks.filter((t) => t.column === activeTask.column).length,
      )
    : "compact";

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
            const pillClass = adminFilterPillClassFor(admin, isActive);
            return (
              <button
                key={admin}
                type="button"
                onClick={() => setFilterAdmin(isActive ? "Tous" : (admin as AdminId))}
                style={isActive ? { borderColor: color, boxShadow: `0 0 0 2px ${color}33` } : {}}
                className={[
                  "ui-transition inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all",
                  pillClass,
                  isActive ? "shadow-sm" : "opacity-90 hover:opacity-100",
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
          title={
            cardDensity === "compact"
              ? "Toutes les cartes en mode compact (dense si 14+ tâches dans la colonne)."
              : `Cartes détaillées si moins de ${KANBAN_AUTO_COMPACT_MIN} tâches par colonne ; au-delà, affichage compact automatique.`
          }
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
              const columnExpanded = expandedColumns.has(col);
              const hiddenCount = Math.max(0, colTasks.length - KANBAN_COLUMN_SOFT_CAP);
              const visibleColTasks =
                columnExpanded || colTasks.length <= KANBAN_COLUMN_SOFT_CAP
                  ? colTasks
                  : colTasks.slice(0, KANBAN_COLUMN_SOFT_CAP);
              const { standalone, groups } = partitionTasksByEvent(visibleColTasks);
              const columnDisplayMode = resolveKanbanCardDisplayMode(cardDensity, colTasks.length);
              const tightColumn = colTasks.length >= KANBAN_AUTO_COMPACT_MIN;
              return (
                <DroppableColumn
                  key={col}
                  id={col}
                  count={colTasks.length}
                  tightList={tightColumn}
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
                      columns={props.columns}
                      companyLogoUrl={companyLogoMap[task.company] ?? null}
                      isMyTask={
                        props.currentUserName
                          ? task.admins.includes(props.currentUserName)
                          : false
                      }
                      onArchive={() => props.onArchiveTask(task.id)}
                      onEdit={() => props.onEditTask(task)}
                      onDelete={() => props.onDeleteTask(task.id)}
                      onMove={(column) => props.onMoveTask(task.id, column)}
                      onOpen={() => {
                        props.lastFocusedTaskIdRef.current = task.id;
                        props.onOpenTask(task.id);
                      }}
                      cardRef={(el) => {
                        props.taskCardRefs.current[task.id] = el;
                      }}
                      cardVariant={columnDisplayMode}
                    />
                  ))}
                  {groups.map(([eventId, evTasks]) => {
                    const collapsed = collapsedEventIds.has(eventId);
                    const eventDragId = `event:${col}:${eventId}`;
                    const folderMenuKey = `${col}:${eventId}`;
                    const sample = evTasks[0];
                    const folderMoveOpen = folderMoveMenuId === folderMenuKey;
                    return (
                      <FolderGroupBlock
                        key={eventId}
                        dragId={eventDragId}
                        column={col}
                        columns={props.columns}
                        collapsed={collapsed}
                        tightColumn={tightColumn}
                        eventId={eventId}
                        sample={sample}
                        taskCount={evTasks.length}
                        folderMenuKey={folderMenuKey}
                        folderMoveOpen={folderMoveOpen}
                        onToggleCollapse={() => toggleEventGroupCollapse(eventId)}
                        onToggleFolderMoveMenu={() =>
                          setFolderMoveMenuId((prev) =>
                            prev === folderMenuKey ? null : folderMenuKey,
                          )
                        }
                        onMoveEntireFolder={(targetCol) =>
                          sample ? moveEntireFolder(sample, targetCol) : undefined
                        }
                        onCopyFolderName={() => {
                          void copyText(
                            sample?.salonName ?? sample?.eventName ?? "Salon",
                            "Nom copié",
                          );
                        }}
                      >
                        {!collapsed && (
                          <div className="space-y-2">
                            {evTasks.map((task) => (
                              <DraggableCard
                                key={task.id}
                                task={task}
                                columns={props.columns}
                                companyLogoUrl={companyLogoMap[task.company] ?? null}
                                isMyTask={
                                  props.currentUserName
                                    ? task.admins.includes(props.currentUserName)
                                    : false
                                }
                                onArchive={() => props.onArchiveTask(task.id)}
                                onEdit={() => props.onEditTask(task)}
                                onDelete={() => props.onDeleteTask(task.id)}
                                onMove={(column) => props.onMoveTask(task.id, column)}
                                onOpen={() => {
                                  props.lastFocusedTaskIdRef.current = task.id;
                                  props.onOpenTask(task.id);
                                }}
                                cardRef={(el) => {
                                  props.taskCardRefs.current[task.id] = el;
                                }}
                                cardVariant={columnDisplayMode}
                              />
                            ))}
                          </div>
                        )}
                      </FolderGroupBlock>
                    );
                  })}
                  {!columnExpanded && hiddenCount > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedColumns((prev) => {
                          const next = new Set(prev);
                          next.add(col);
                          return next;
                        })
                      }
                      className="ui-transition mt-1 rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-[11px] font-semibold text-[color:var(--foreground)]/65 hover:border-[var(--line-strong)] hover:bg-[var(--surface)]"
                    >
                      Voir {hiddenCount} tâche{hiddenCount > 1 ? "s" : ""} de plus
                    </button>
                  )}
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
                    variant={overlayDisplayMode}
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
