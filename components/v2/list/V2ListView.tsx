"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ChevronDown,
  ChevronRight,
  MessageSquarePlus,
  Plus,
} from "lucide-react";
import AdminAvatar from "../../AdminAvatar";
import CompanyAvatar from "../../CompanyAvatar";
import type { ReferenceRecord } from "../../../lib/referenceData";
import { columnStyles, adminFilterPillClassFor, adminSolidColorFor, domainTagStyles } from "../../../lib/kanbanStyles";
import {
  priorities,
  type AdminId,
  type ColumnId,
  type Company,
  type Domain,
  type Priority,
  type Task,
} from "../../../lib/types";

const PRIORITY_STYLES: Record<Priority, string> = {
  Haute: "bg-rose-100 text-rose-800 border-rose-200",
  Moyenne: "bg-amber-100 text-amber-800 border-amber-200",
  Basse: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

function formatElapsed(ms: number): string {
  if (!ms || ms <= 0) return "—";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ""}`;
  return `${m}m`;
}

function projectedWorkSummary(task: Task): string {
  const slots = task.projectedWork ?? [];
  if (slots.length === 0) return "—";
  const dates = slots.map((s) => s.date).sort();
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (first === last) return format(new Date(first + "T12:00:00"), "d MMM", { locale: fr });
  return `${format(new Date(first + "T12:00:00"), "d MMM", { locale: fr })} → ${format(new Date(last + "T12:00:00"), "d MMM", { locale: fr })}`;
}

type V2ListViewProps = {
  tasks: Task[];
  columns: ColumnId[];
  admins: AdminId[];
  companies: Company[];
  domains: Domain[];
  companyRecords: ReferenceRecord[];
  now: number;
  currentUserName?: string | null;
  onOpenTask: (taskId: string) => void;
  onMoveTask: (taskId: string, column: ColumnId) => void;
  onInlineSave: (taskId: string, patch: Partial<Task>, dbPatch: Record<string, unknown>) => void | Promise<void>;
  onQuickAdd: (title: string, column: ColumnId) => void | Promise<void>;
  onEditTask: (task: Task) => void;
};

type ListColumnDef = {
  id: string;
  label: string;
  width: string;
  sticky?: boolean;
};

const LIST_COLUMNS: ListColumnDef[] = [
  { id: "select", label: "", width: "40px" },
  { id: "item", label: "Élément", width: "minmax(220px, 1.4fr)", sticky: true },
  { id: "status", label: "Statut", width: "minmax(130px, 0.9fr)" },
  { id: "priority", label: "Priorité", width: "minmax(110px, 0.7fr)" },
  { id: "assignees", label: "Assignés", width: "minmax(120px, 0.8fr)" },
  { id: "deadline", label: "Échéance", width: "minmax(120px, 0.75fr)" },
  { id: "timeline", label: "Planification", width: "minmax(130px, 0.85fr)" },
  { id: "company", label: "Société", width: "minmax(130px, 0.85fr)" },
  { id: "domain", label: "Domaine", width: "minmax(130px, 0.85fr)" },
  { id: "client", label: "Client", width: "minmax(120px, 0.75fr)" },
  { id: "budget", label: "Budget", width: "minmax(90px, 0.6fr)" },
  { id: "event", label: "Événement", width: "minmax(140px, 0.9fr)" },
  { id: "estimated", label: "Estimation", width: "minmax(100px, 0.65fr)" },
  { id: "elapsed", label: "Temps passé", width: "minmax(100px, 0.65fr)" },
  { id: "subtasks", label: "Sous-tâches", width: "minmax(90px, 0.55fr)" },
  { id: "description", label: "Description", width: "minmax(160px, 1fr)" },
];

const GRID_TEMPLATE = LIST_COLUMNS.map((c) => c.width).join(" ");

function StatusCell({
  value,
  columns,
  onChange,
}: {
  value: ColumnId;
  columns: ColumnId[];
  onChange: (next: ColumnId) => void;
}) {
  const styles = columnStyles[value] ?? columnStyles["À faire"];
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ColumnId)}
      className={[
        "w-full cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30",
        styles.cellBg,
        styles.cellBorder,
        styles.headerText,
      ].join(" ")}
      aria-label="Statut"
    >
      {columns.map((col) => (
        <option key={col} value={col}>
          {col}
        </option>
      ))}
    </select>
  );
}

function PriorityCell({
  value,
  onChange,
}: {
  value: Priority;
  onChange: (next: Priority) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Priority)}
      className={[
        "w-full cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30",
        PRIORITY_STYLES[value],
      ].join(" ")}
      aria-label="Priorité"
    >
      {priorities.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}

function AssigneesCell({
  task,
  admins,
  onSave,
}: {
  task: Task;
  admins: AdminId[];
  onSave: (next: AdminId[]) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-[32px] w-full items-center gap-1 rounded-lg border border-transparent px-1 py-0.5 hover:border-[var(--line)] hover:bg-[var(--surface-soft)]"
        aria-label="Assignés"
      >
        {task.admins.length === 0 ? (
          <span className="text-xs text-[color:var(--foreground)]/40">—</span>
        ) : (
          <span className="flex -space-x-1.5">
            {task.admins.slice(0, 3).map((a) => (
              <AdminAvatar key={a} admin={a} size="sm" />
            ))}
            {task.admins.length > 3 && (
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-soft)] text-[9px] font-bold text-[color:var(--foreground)]/60">
                +{task.admins.length - 3}
              </span>
            )}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[180px] rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-[var(--shadow-2)]">
          {admins.map((name) => {
            const checked = task.admins.includes(name);
            return (
              <label
                key={name}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--surface-soft)]"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked
                      ? task.admins.length > 1
                        ? task.admins.filter((a) => a !== name)
                        : task.admins
                      : [...task.admins, name];
                    onSave(next);
                  }}
                  className="rounded border-[var(--line)]"
                />
                <AdminAvatar admin={name} size="sm" />
                <span className="truncate text-[color:var(--foreground)]/80">{name}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ListRow({
  task,
  columns,
  admins,
  companies,
  domains,
  companyRecords,
  now,
  selected,
  onToggleSelect,
  onOpenTask,
  onMoveTask,
  onInlineSave,
  onEditTask,
}: {
  task: Task;
  columns: ColumnId[];
  admins: AdminId[];
  companies: Company[];
  domains: Domain[];
  companyRecords: ReferenceRecord[];
  now: number;
  selected: boolean;
  onToggleSelect: () => void;
  onOpenTask: (taskId: string) => void;
  onMoveTask: (taskId: string, column: ColumnId) => void;
  onInlineSave: V2ListViewProps["onInlineSave"];
  onEditTask: (task: Task) => void;
}) {
  const companyLogo = companyRecords.find((c) => c.name === task.company)?.logoUrl ?? null;
  const deadlineMs = task.deadline ? new Date(task.deadline + "T23:59:59").getTime() : 0;
  const isOverdue = deadlineMs > 0 && now > deadlineMs && task.column !== "Terminé";
  const domainStyle = domainTagStyles[task.domain] ?? domainTagStyles.default;

  const saveField = useCallback(
    (patch: Partial<Task>, dbPatch: Record<string, unknown>) => {
      void onInlineSave(task.id, patch, dbPatch);
    },
    [onInlineSave, task.id],
  );

  return (
    <div
      role="row"
      className={[
        "group grid min-h-[44px] items-center border-b border-[var(--line)] text-sm transition-colors hover:bg-[var(--surface-soft)]/80",
        selected ? "bg-[var(--accent)]/5" : "bg-[var(--surface)]",
      ].join(" ")}
      style={{ gridTemplateColumns: GRID_TEMPLATE }}
    >
      <div role="cell" className="flex items-center justify-center px-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="rounded border-[var(--line)]"
          aria-label={`Sélectionner ${task.projectName}`}
        />
      </div>

      <div role="cell" className="flex min-w-0 items-center gap-1 border-r border-[var(--line)] px-2 py-1.5">
        <button
          type="button"
          onClick={() => onOpenTask(task.id)}
          className="min-w-0 flex-1 truncate text-left font-semibold text-[var(--foreground)] hover:text-[var(--accent)]"
          title={task.projectName}
        >
          {task.projectName}
        </button>
        <button
          type="button"
          onClick={() => onOpenTask(task.id)}
          className="shrink-0 rounded-md p-1 text-[color:var(--foreground)]/35 opacity-0 transition-opacity hover:bg-[var(--surface-soft)] hover:text-[var(--accent)] group-hover:opacity-100"
          aria-label="Ouvrir les mises à jour"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div role="cell" className="px-2 py-1">
        <StatusCell
          value={task.column}
          columns={columns}
          onChange={(col) => onMoveTask(task.id, col)}
        />
      </div>

      <div role="cell" className="px-2 py-1">
        <PriorityCell
          value={task.priority}
          onChange={(p) => saveField({ priority: p }, { priority: p })}
        />
      </div>

      <div role="cell" className="px-2 py-1">
        <AssigneesCell
          task={task}
          admins={admins}
          onSave={(next) =>
            saveField({ admins: next }, { admin: next.join(","), lane: next[0] ?? null })
          }
        />
      </div>

      <div role="cell" className="px-2 py-1">
        <input
          type="date"
          value={task.deadline || ""}
          onChange={(e) => {
            const deadline = e.target.value;
            saveField({ deadline }, { deadline: deadline || null });
          }}
          className={[
            "w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30",
            isOverdue ? "border-rose-300 text-rose-700" : "",
          ].join(" ")}
          aria-label="Échéance"
        />
      </div>

      <div role="cell" className="truncate px-2 py-1 text-xs text-[color:var(--foreground)]/65" title={projectedWorkSummary(task)}>
        {projectedWorkSummary(task)}
      </div>

      <div role="cell" className="px-2 py-1">
        <div className="flex items-center gap-1.5">
          <CompanyAvatar
            name={task.company}
            logoUrl={companyLogo}
            className="h-5 w-5 shrink-0 rounded-sm object-contain"
            fallbackClassName="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/40"
            iconClassName="h-3 w-3"
          />
          <select
            value={task.company}
            onChange={(e) => saveField({ company: e.target.value as Company }, { company: e.target.value })}
            className="min-w-0 flex-1 truncate rounded-lg border border-[var(--line)] bg-[var(--surface)] px-1.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            aria-label="Société"
          >
            {companies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div role="cell" className="px-2 py-1">
        <select
          value={task.domain}
          onChange={(e) => saveField({ domain: e.target.value as Domain }, { domain: e.target.value })}
          className={[
            "w-full truncate rounded-lg border px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30",
            domainStyle,
          ].join(" ")}
          aria-label="Domaine"
        >
          {domains.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div role="cell" className="px-2 py-1">
        <input
          type="text"
          defaultValue={task.clientName}
          placeholder={task.isClientRequest ? "Demande client" : "—"}
          onBlur={(e) => {
            const clientName = e.target.value.trim();
            if (clientName === (task.clientName ?? "")) return;
            saveField({ clientName }, { client_name: clientName });
          }}
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          aria-label="Client"
        />
      </div>

      <div role="cell" className="px-2 py-1">
        <input
          type="text"
          defaultValue={task.budget}
          onBlur={(e) => {
            const budget = e.target.value;
            if (budget === task.budget) return;
            saveField({ budget }, { budget });
          }}
          className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
          aria-label="Budget"
        />
      </div>

      <div role="cell" className="truncate px-2 py-1 text-xs text-[color:var(--foreground)]/65">
        {task.eventName ? (
          <button
            type="button"
            onClick={() => onEditTask(task)}
            className="truncate text-left hover:text-[var(--accent)]"
            title={task.eventCategory ?? undefined}
          >
            {task.eventName}
          </button>
        ) : (
          "—"
        )}
      </div>

      <div role="cell" className="px-2 py-1 text-xs tabular-nums text-[color:var(--foreground)]/70">
        {task.estimatedHours > 0 || task.estimatedDays > 0
          ? [
              task.estimatedHours > 0 ? `${task.estimatedHours}h` : null,
              task.estimatedDays > 0 ? `${task.estimatedDays}j` : null,
            ]
              .filter(Boolean)
              .join(" · ")
          : "—"}
      </div>

      <div role="cell" className="px-2 py-1 text-xs tabular-nums text-[color:var(--foreground)]/70">
        {task.isRunning ? (
          <span className="font-semibold text-[var(--accent)]">{formatElapsed(task.elapsedMs)} +</span>
        ) : (
          formatElapsed(task.elapsedMs)
        )}
      </div>

      <div role="cell" className="px-2 py-1 text-xs text-[color:var(--foreground)]/65">
        {(task.subtasks?.length ?? 0) > 0
          ? `${task.subtasks!.filter((s) => s.column === "Terminé").length}/${task.subtasks!.length}`
          : "—"}
      </div>

      <div
        role="cell"
        className="truncate px-2 py-1 text-xs text-[color:var(--foreground)]/55"
        title={task.description}
      >
        {task.description || "—"}
      </div>
    </div>
  );
}

function AddItemRow({
  groupColumn,
  onQuickAdd,
}: {
  groupColumn: ColumnId;
  onQuickAdd: (title: string, column: ColumnId) => void | Promise<void>;
}) {
  const [value, setValue] = useState("");
  return (
    <div
      role="row"
      className="grid min-h-[40px] items-center border-b border-[var(--line)] bg-[var(--surface-soft)]/40"
      style={{ gridTemplateColumns: GRID_TEMPLATE }}
    >
      <div className="px-2" />
      <div className="col-span-full flex items-center gap-2 px-2 py-1.5" style={{ gridColumn: "2 / -1" }}>
        <Plus className="h-3.5 w-3.5 shrink-0 text-[color:var(--foreground)]/40" />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) {
              void onQuickAdd(value.trim(), groupColumn);
              setValue("");
            }
          }}
          placeholder="Ajouter un élément"
          className="w-full bg-transparent text-sm text-[color:var(--foreground)]/70 placeholder:text-[color:var(--foreground)]/40 focus:outline-none"
        />
      </div>
    </div>
  );
}

export default function V2ListView(props: V2ListViewProps) {
  const {
    tasks,
    columns,
    admins,
    companies,
    domains,
    companyRecords,
    now,
    currentUserName,
    onOpenTask,
    onMoveTask,
    onInlineSave,
    onQuickAdd,
    onEditTask,
  } = props;

  const filterTouchedRef = useRef(false);
  const [selectedAdmins, setSelectedAdmins] = useState<Set<AdminId>>(() => {
    if (currentUserName && admins.includes(currentUserName)) {
      return new Set([currentUserName]);
    }
    return new Set();
  });
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (filterTouchedRef.current) return;
    if (currentUserName && admins.includes(currentUserName)) {
      setSelectedAdmins(new Set([currentUserName]));
    }
  }, [currentUserName, admins]);

  const toggleAdminFilter = (admin: AdminId) => {
    filterTouchedRef.current = true;
    setSelectedAdmins((prev) => {
      const next = new Set(prev);
      if (next.has(admin)) next.delete(admin);
      else next.add(admin);
      return next;
    });
  };

  const clearAdminFilter = () => {
    filterTouchedRef.current = true;
    setSelectedAdmins(new Set());
  };

  const filteredTasks = useMemo(() => {
    if (selectedAdmins.size === 0) return tasks;
    return tasks.filter((task) => task.admins.some((a) => selectedAdmins.has(a)));
  }, [tasks, selectedAdmins]);

  const adminCounts = useMemo(
    () =>
      admins.reduce<Record<string, number>>((acc, admin) => {
        acc[admin] = tasks.filter((t) => t.admins.includes(admin)).length;
        return acc;
      }, {}),
    [admins, tasks],
  );

  const tasksByColumn = useMemo(() => {
    const map = new Map<ColumnId, Task[]>();
    for (const col of columns) map.set(col, []);
    for (const task of filteredTasks) {
      const col = columns.includes(task.column) ? task.column : columns[0];
      const list = map.get(col) ?? [];
      list.push(task);
      map.set(col, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => {
        const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return da - db;
      });
    }
    return map;
  }, [filteredTasks, columns]);

  const toggleGroup = (col: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/50">
            Voir
          </span>

          <button
            type="button"
            onClick={clearAdminFilter}
            className={[
              "ui-transition inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-all",
              selectedAdmins.size === 0
                ? "border-[var(--line-strong)] bg-[var(--foreground)] text-[var(--background)] shadow-sm"
                : "border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/65 hover:bg-[var(--surface)]",
            ].join(" ")}
          >
            Tous
            <span className="rounded-full bg-current/20 px-1.5 py-0.5 text-[9px]">
              {tasks.length}
            </span>
          </button>

          {admins.map((admin) => {
            const isActive = selectedAdmins.has(admin);
            const color = adminSolidColorFor(admin);
            const pillClass = adminFilterPillClassFor(admin);
            return (
              <button
                key={admin}
                type="button"
                onClick={() => toggleAdminFilter(admin)}
                style={isActive ? { borderColor: color, boxShadow: `0 0 0 2px ${color}33` } : {}}
                className={[
                  "ui-transition inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all",
                  pillClass,
                  isActive ? "ring-2" : "opacity-80 hover:opacity-100",
                ].join(" ")}
              >
                <AdminAvatar admin={admin} size="sm" />
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

        {selectedAdmins.size > 0 ? (
          <p className="text-[11px] text-[color:var(--foreground)]/50">
            {filteredTasks.length} tâche{filteredTasks.length !== 1 ? "s" : ""} pour{" "}
            {Array.from(selectedAdmins).join(", ")}
          </p>
        ) : null}
      </div>

    <div className="ui-surface overflow-hidden rounded-2xl border border-[var(--line)]">
      <div className="overflow-x-auto">
        <div role="table" className="min-w-[1400px]">
          <div
            role="row"
            className="sticky top-0 z-20 grid border-b border-[var(--line)] bg-[var(--surface-soft)] text-[11px] font-bold uppercase tracking-[0.12em] text-[color:var(--foreground)]/50"
            style={{ gridTemplateColumns: GRID_TEMPLATE }}
          >
            {LIST_COLUMNS.map((col) => (
              <div
                key={col.id}
                role="columnheader"
                className={[
                  "px-2 py-3",
                  col.sticky ? "border-r border-[var(--line)]" : "",
                ].join(" ")}
              >
                {col.label}
              </div>
            ))}
          </div>

          {columns.map((groupColumn) => {
            const groupTasks = tasksByColumn.get(groupColumn) ?? [];
            const collapsed = collapsedGroups.has(groupColumn);
            const styles = columnStyles[groupColumn] ?? columnStyles["À faire"];

            return (
              <div key={groupColumn} role="rowgroup" className="border-b border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => toggleGroup(groupColumn)}
                  className={[
                    "flex w-full items-center gap-2 border-l-4 px-4 py-2.5 text-left text-sm font-semibold transition-colors hover:bg-[var(--surface-soft)]",
                    styles.headerText,
                  ].join(" ")}
                  style={{ borderLeftColor: "var(--accent)" }}
                >
                  {collapsed ? (
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                  )}
                  <span>{groupColumn}</span>
                  <span className="rounded-full bg-[color:var(--foreground)]/8 px-2 py-0.5 text-[11px] font-semibold text-[color:var(--foreground)]/55">
                    {groupTasks.length} élément{groupTasks.length !== 1 ? "s" : ""}
                  </span>
                </button>

                {!collapsed && (
                  <>
                    {groupTasks.length === 0 ? (
                      <div className="border-t border-dashed border-[var(--line)] px-4 py-6 text-center text-sm text-[color:var(--foreground)]/45">
                        Aucun élément dans ce groupe.
                      </div>
                    ) : (
                      groupTasks.map((task) => (
                        <ListRow
                          key={task.id}
                          task={task}
                          columns={columns}
                          admins={admins}
                          companies={companies}
                          domains={domains}
                          companyRecords={companyRecords}
                          now={now}
                          selected={selectedIds.has(task.id)}
                          onToggleSelect={() =>
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(task.id)) next.delete(task.id);
                              else next.add(task.id);
                              return next;
                            })
                          }
                          onOpenTask={onOpenTask}
                          onMoveTask={onMoveTask}
                          onInlineSave={onInlineSave}
                          onEditTask={onEditTask}
                        />
                      ))
                    )}
                    <AddItemRow groupColumn={groupColumn} onQuickAdd={onQuickAdd} />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
    </div>
  );
}
