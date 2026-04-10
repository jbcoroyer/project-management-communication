"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Archive,
  Building2,
  Check,
  Focus,
  Layers,
  Plus,
  Pencil,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import AdminAvatar from "./AdminAvatar";
import SubtasksPanel from "./SubtasksPanel";
import { adminBadgeClassFor, domainTagStyles } from "../lib/kanbanStyles";
import type { Task, AdminId, ColumnId, Priority, ProjectedWorkItem } from "../lib/types";
import { priorities } from "../lib/types";
import { completedAtPatchForColumnChange } from "../lib/completedAt";
import type { ReferenceRecord } from "../lib/referenceData";
import { computeSlotHours, HALF_HOUR_OPTIONS } from "../lib/projectedWorkUtils";

/* ─── Chip d'info (affichage) ─── */
function InfoChip(props: {
  icon?: React.ReactNode;
  label: string;
  value?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={["rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2", props.className].join(" ")}>
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/45">
        {props.icon}
        {props.label}
      </p>
      {props.children ?? (
        <p className="mt-0.5 text-sm font-medium text-[var(--foreground)]">{props.value || "—"}</p>
      )}
    </div>
  );
}

/* ─── Badge priorité ─── */
function PriorityBadge({ priority }: { priority: Priority }) {
  const cls = {
    Haute: "border-rose-200 bg-rose-50 text-rose-700",
    Moyenne: "border-amber-200 bg-amber-50 text-amber-700",
    Basse: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }[priority] ?? "border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/70";
  return (
    <span className={["inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", cls].join(" ")}>
      {priority}
    </span>
  );
}

/* ─── Composant principal ─── */
export default function TaskDetailPanel(props: {
  task: Task;
  allTasks: Task[];
  adminRecords: ReferenceRecord[];
  companyRecords: ReferenceRecord[];
  domainRecords: ReferenceRecord[];
  columnRecords: ReferenceRecord[];
  admins: string[];
  columns: string[];
  now: number;
  onClose: () => void;
  onSave: (taskId: string, patch: Partial<Task>, dbPatch: Record<string, unknown>) => Promise<void>;
  onArchive: () => void;
  onDelete: () => void;
  onSubtaskCreated: (task: Task) => void;
  onSubtaskUpdated: (taskId: string, patch: Partial<Task>, dbPatch: Record<string, unknown>) => void;
  onSubtaskDeleted: (taskId: string) => void;
}) {
  const { task } = props;
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  // Champs éditables
  const [editTitle, setEditTitle] = useState(task.projectName);
  const [editCompany, setEditCompany] = useState(task.company);
  const [editDomain, setEditDomain] = useState(task.domain);
  const [editAdmins, setEditAdmins] = useState<string[]>([...task.admins]);
  const [editPriority, setEditPriority] = useState<Priority>(task.priority);
  const [editColumn, setEditColumn] = useState<ColumnId>(task.column);
  const [editBudget, setEditBudget] = useState(task.budget || "");
  const [editDescription, setEditDescription] = useState(task.description || "");

  const [planDeadline, setPlanDeadline] = useState(task.deadline || "");
  const [planProjectedWork, setPlanProjectedWork] = useState<ProjectedWorkItem[]>(task.projectedWork ?? []);
  const [planEstimateUnit, setPlanEstimateUnit] = useState<"hours" | "days">(
    task.estimatedDays > 0 ? "days" : "hours",
  );
  const [planEstimatedHours, setPlanEstimatedHours] = useState(
    task.estimatedHours > 0 ? String(task.estimatedHours) : "",
  );
  const [planEstimatedDays, setPlanEstimatedDays] = useState(
    task.estimatedDays > 0 ? String(task.estimatedDays) : "",
  );
  const [planningSaving, setPlanningSaving] = useState(false);

  const startEdit = () => {
    setEditTitle(task.projectName);
    setEditCompany(task.company);
    setEditDomain(task.domain);
    setEditAdmins([...task.admins]);
    setEditPriority(task.priority);
    setEditColumn(task.column);
    setEditBudget(task.budget || "");
    setEditDescription(task.description || "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editTitle.trim()) return;
    setSaving(true);
    const colMerge = completedAtPatchForColumnChange(task.column, editColumn);
    const patch: Partial<Task> = {
      projectName: editTitle.trim().charAt(0).toUpperCase() + editTitle.trim().slice(1).toLowerCase(),
      company: editCompany,
      domain: editDomain,
      admins: editAdmins,
      priority: editPriority,
      column: editColumn,
      budget: editBudget,
      description: editDescription,
    };
    if ("completed_at" in colMerge) {
      patch.completedAt = colMerge.completed_at === null ? undefined : colMerge.completed_at;
    }
    const dbPatch: Record<string, unknown> = {
      project_name: patch.projectName,
      company: editCompany,
      domain: editDomain,
      admin: editAdmins.join(","),
      lane: editAdmins[0],
      priority: editPriority,
      column_id: editColumn,
      budget: editBudget,
      description: editDescription,
      ...colMerge,
    };
    await props.onSave(task.id, patch, dbPatch);
    setSaving(false);
    setIsEditing(false);
  };

  const handleSavePlanning = async () => {
    setPlanningSaving(true);
    const normalizedProjectedWork = planProjectedWork.map((slot) => ({
      ...slot,
      hours: computeSlotHours(slot),
    }));
    const estH = planEstimateUnit === "hours" ? parseFloat(planEstimatedHours.replace(",", ".")) || 0 : 0;
    const estD = planEstimateUnit === "days" ? parseFloat(planEstimatedDays.replace(",", ".")) || 0 : 0;
    const patch: Partial<Task> = {
      deadline: planDeadline || "",
      projectedWork: normalizedProjectedWork,
      estimatedHours: estH,
      estimatedDays: estD,
    };
    const dbPatch: Record<string, unknown> = {
      deadline: planDeadline || null,
      projected_work: normalizedProjectedWork,
      estimated_hours: estH,
      estimated_days: estD,
    };
    await props.onSave(task.id, patch, dbPatch);
    setPlanningSaving(false);
  };

  const toggleAdmin = (name: string) => {
    setEditAdmins((prev) =>
      prev.includes(name)
        ? prev.length > 1 ? prev.filter((a) => a !== name) : prev
        : [...prev, name],
    );
  };

  const deadlineMs = task.deadline ? new Date(task.deadline + "T23:59:59").getTime() : 0;
  const isOverdue = !isEditing && deadlineMs > 0 && props.now > deadlineMs;
  const domainStyle = domainTagStyles[task.domain] ?? domainTagStyles.default;
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={[
          "fixed inset-0 z-40 bg-slate-950/24 backdrop-blur-[1px]",
          isFocusMode ? "bg-slate-950/35" : "",
        ].join(" ")}
        onClick={props.onClose}
      />

      {/* Panel */}
      <motion.aside
        role="dialog"
        aria-label="Détail de la tâche"
        initial={{ opacity: 0, x: 42 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 42 }}
        transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.7 }}
        className={[
          "fixed z-50 flex w-full flex-col overflow-hidden bg-[var(--surface)]/97 shadow-[0_34px_90px_rgba(20,17,13,0.24)] backdrop-blur",
          isFocusMode
            ? "left-1/2 top-1/2 h-[86vh] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--line)]"
            : "right-0 top-[64px] h-[calc(100vh-64px)] max-w-xl border-l border-[var(--line)]",
        ].join(" ")}
      >
        {/* ── En-tête ── */}
        <div className="shrink-0 border-b border-[var(--line)] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/50">
                Détail tâche
              </p>
              {isEditing ? (
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="ui-focus-ring mt-1 w-full rounded-lg border border-[var(--line)]/90 bg-[var(--surface)] px-2 py-1 text-2xl font-semibold tracking-tight text-[var(--foreground)]"
                  autoFocus
                />
              ) : (
                <h2 className="ui-heading mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)] truncate">
                  {task.projectName || "Projet sans titre"}
                </h2>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsFocusMode((v) => !v)}
                className="ui-transition inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-semibold text-[color:var(--foreground)]/70 hover:bg-[var(--surface-soft)]"
                title={isFocusMode ? "Quitter le mode focus" : "Passer en mode focus"}
              >
                <Focus className="h-3.5 w-3.5" />
                {isFocusMode ? "Quitter focus" : "Mode focus"}
              </button>
              {!isEditing ? (
                <button
                  type="button"
                  onClick={startEdit}
                  className="ui-transition inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)] hover:text-[color:var(--foreground)]/75"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Modifier
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="ui-transition inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-xs font-semibold text-[#fffdf9] hover:bg-[var(--accent-strong)] disabled:opacity-60"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {saving ? "Sauvegarde…" : "Sauvegarder"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="ui-transition inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[color:var(--foreground)]/60 hover:bg-[var(--surface-soft)]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={props.onClose}
                aria-label="Fermer"
                className="ui-transition inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] text-[color:var(--foreground)]/60 hover:bg-[var(--surface-soft)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Corps scrollable ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ── Labels / Métadonnées ── */}
          {!isEditing ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <InfoChip
                icon={<Building2 className="h-3 w-3" />}
                label="Société"
                value={task.company}
              />
              <InfoChip
                icon={<Layers className="h-3 w-3" />}
                label="Domaine"
              >
                <span className={["mt-1 inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold", domainStyle].join(" ")}>
                  {task.domain}
                </span>
              </InfoChip>
              <InfoChip
                icon={<Tag className="h-3 w-3" />}
                label="État"
                value={task.column}
              />
              <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2">
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/45">
                  <Tag className="h-3 w-3" />Priorité
                </p>
                <div className="mt-1">
                  <PriorityBadge priority={task.priority} />
                </div>
              </div>
              <InfoChip
                icon={<Tag className="h-3 w-3" />}
                label="Budget"
                value={task.budget || "—"}
              />
              {/* Responsables — pleine largeur */}
              <div className="col-span-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 sm:col-span-3">
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/45">
                  Responsables
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {task.admins.map((admin) => (
                    <span
                      key={admin}
                      className={["inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", adminBadgeClassFor(admin)].join(" ")}
                    >
                      <AdminAvatar admin={admin as AdminId} />
                      {admin}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ── Mode édition : formulaire compact ── */
            <div className="space-y-3 rounded-2xl border border-[var(--line)]/80 bg-[var(--surface-soft)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/50">Édition en cours</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/55">Société</label>
                  <select
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                    className="ui-focus-ring mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-sm"
                  >
                    {props.companyRecords.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/55">Domaine</label>
                  <select
                    value={editDomain}
                    onChange={(e) => setEditDomain(e.target.value)}
                    className="ui-focus-ring mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-sm"
                  >
                    {props.domainRecords.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/55">État</label>
                  <select
                    value={editColumn}
                    onChange={(e) => setEditColumn(e.target.value as ColumnId)}
                    className="ui-focus-ring mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-sm"
                  >
                    {props.columnRecords.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/55">Priorité</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as Priority)}
                    className="ui-focus-ring mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-sm"
                  >
                    {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/55">Budget</label>
                  <input
                    type="text"
                    value={editBudget}
                    onChange={(e) => setEditBudget(e.target.value)}
                    placeholder="Ex : 5 000 €"
                    className="ui-focus-ring mt-1 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-sm"
                  />
                </div>
              </div>

              {/* Responsables */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/55">Responsables</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {props.admins.map((admin) => {
                    const selected = editAdmins.includes(admin);
                    return (
                      <button
                        key={admin}
                        type="button"
                        onClick={() => toggleAdmin(admin)}
                        className={[
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition",
                          selected
                            ? adminBadgeClassFor(admin)
                            : "border-[var(--line)] bg-[var(--surface)] text-[color:var(--foreground)]/50 opacity-60 hover:opacity-100",
                        ].join(" ")}
                      >
                        <AdminAvatar admin={admin as AdminId} />
                        {admin.split(" ")[0]}
                        {selected && <Check className="h-3 w-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Tâches et planning ── */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/45">
                Tâches et planning
              </p>
              <button
                type="button"
                onClick={() => void handleSavePlanning()}
                disabled={planningSaving}
                className="ui-transition rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#fffdf9] hover:bg-[var(--accent-strong)] disabled:opacity-60"
              >
                {planningSaving ? "Enregistrement…" : "Enregistrer le planning"}
              </button>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/55">
                  Date limite (deadline)
                </label>
                <input
                  type="date"
                  value={planDeadline}
                  onChange={(e) => setPlanDeadline(e.target.value)}
                  className={[
                    "ui-focus-ring mt-1 w-full rounded-lg border bg-[var(--surface)] px-2.5 py-1.5 text-sm",
                    isOverdue ? "border-rose-300" : "border-[var(--line)]",
                  ].join(" ")}
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/55">
                  Temps à passer sur la tâche
                </label>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <div className="inline-flex rounded-lg border border-[var(--line)] bg-[var(--surface)] p-0.5">
                    <button
                      type="button"
                      onClick={() => setPlanEstimateUnit("hours")}
                      className={[
                        "rounded-md px-2 py-1 text-xs font-medium",
                        planEstimateUnit === "hours"
                          ? "bg-[var(--accent)] text-[#fffdf9]"
                          : "text-[color:var(--foreground)]/70 hover:bg-[var(--surface-soft)]",
                      ].join(" ")}
                    >
                      h
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlanEstimateUnit("days")}
                      className={[
                        "rounded-md px-2 py-1 text-xs font-medium",
                        planEstimateUnit === "days"
                          ? "bg-[var(--accent)] text-[#fffdf9]"
                          : "text-[color:var(--foreground)]/70 hover:bg-[var(--surface-soft)]",
                      ].join(" ")}
                    >
                      j
                    </button>
                  </div>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={planEstimateUnit === "hours" ? planEstimatedHours : planEstimatedDays}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (planEstimateUnit === "hours") setPlanEstimatedHours(v);
                      else setPlanEstimatedDays(v);
                    }}
                    placeholder={planEstimateUnit === "hours" ? "Ex : 3.5" : "Ex : 2"}
                    className="ui-focus-ring max-w-[140px] rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/45">
                Créneaux calendrier (date + horaires)
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setPlanProjectedWork((prev) => [
                      ...prev,
                      {
                        date: planDeadline || new Date().toISOString().slice(0, 10),
                        hours: 2,
                      },
                    ])
                  }
                  className="ui-transition inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Jour (durée)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPlanProjectedWork((prev) => [
                      ...prev,
                      {
                        date: planDeadline || new Date().toISOString().slice(0, 10),
                        startTime: "08:00",
                        endTime: "10:00",
                        hours: 2,
                      },
                    ])
                  }
                  className="ui-transition inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs font-semibold text-[color:var(--foreground)]/70 hover:bg-[var(--surface-soft)]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Créneau horaire
                </button>
              </div>
            </div>

            {planProjectedWork.length === 0 ? (
              <p className="text-xs text-[color:var(--foreground)]/45">Aucun créneau — ajoutez une journée ou un créneau horaire.</p>
            ) : (
              <div className="space-y-2">
                {planProjectedWork.map((slot, index) => {
                  const isDayOnly = !slot.startTime && !slot.endTime;
                  return (
                    <div
                      key={`${slot.date}-${index}`}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-2 text-xs"
                    >
                      <input
                        type="date"
                        value={slot.date}
                        onChange={(e) =>
                          setPlanProjectedWork((prev) =>
                            prev.map((p, i) => (i === index ? { ...p, date: e.target.value } : p)),
                          )
                        }
                        className="ui-focus-ring rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1"
                      />
                      {isDayOnly ? (
                        <>
                          <label className="inline-flex items-center gap-1 text-[color:var(--foreground)]/65">
                            h
                            <input
                              type="number"
                              min={0}
                              step={0.5}
                              value={slot.hours ?? 0}
                              onChange={(e) =>
                                setPlanProjectedWork((prev) =>
                                  prev.map((p, i) =>
                                    i === index ? { ...p, hours: parseFloat(e.target.value) || 0 } : p,
                                  ),
                                )
                              }
                              className="ui-focus-ring w-16 rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1"
                            />
                          </label>
                          <span className="rounded-md border border-[var(--line)]/85 bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--foreground)]/75">
                            Journée
                          </span>
                        </>
                      ) : (
                        <>
                          <select
                            value={slot.startTime ?? "08:00"}
                            onChange={(e) =>
                              setPlanProjectedWork((prev) =>
                                prev.map((p, i) => (i === index ? { ...p, startTime: e.target.value } : p)),
                              )
                            }
                            className="ui-focus-ring rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1"
                          >
                            {HALF_HOUR_OPTIONS.map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                          <span className="text-[color:var(--foreground)]/50">→</span>
                          <select
                            value={slot.endTime ?? "10:00"}
                            onChange={(e) =>
                              setPlanProjectedWork((prev) =>
                                prev.map((p, i) => (i === index ? { ...p, endTime: e.target.value } : p)),
                              )
                            }
                            className="ui-focus-ring rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1"
                          >
                            {HALF_HOUR_OPTIONS.map((time) => (
                              <option key={time} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                          <span className="rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1 text-[color:var(--foreground)]/60">
                            {computeSlotHours(slot)} h
                          </span>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setPlanProjectedWork((prev) => prev.filter((_, i) => i !== index))}
                        className="ml-auto rounded-md px-2 py-1 text-rose-600 hover:bg-rose-50"
                      >
                        Supprimer
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Description ── */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/45">
              Description
            </p>
            {isEditing ? (
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
                className="ui-focus-ring mt-2 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                placeholder="Notes, objectifs, contraintes…"
              />
            ) : (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--foreground)]/80">
                {task.description || <span className="italic text-[color:var(--foreground)]/35">Aucune description</span>}
              </p>
            )}
          </div>

          {/* ── Étapes / Sous-tâches ── */}
          <SubtasksPanel
            parentTask={task}
            allTasks={props.allTasks}
            admins={props.admins}
            columns={props.columns}
            now={props.now}
            onSubtaskCreated={props.onSubtaskCreated}
            onSubtaskUpdated={props.onSubtaskUpdated}
            onSubtaskDeleted={props.onSubtaskDeleted}
          />
        </div>

        {/* ── Actions en bas ── */}
        <div className="shrink-0 border-t border-[var(--line)] px-5 py-3 flex gap-2">
          <button
            type="button"
            onClick={props.onArchive}
            className="ui-transition flex items-center gap-1.5 rounded-xl border border-[#e6c9c2] bg-[#f8ecea] px-3 py-2 text-sm font-medium text-[#9b534c] hover:bg-[#f3dfdc]"
          >
            <Archive className="h-3.5 w-3.5" />
            Archiver
          </button>
          <button
            type="button"
            onClick={props.onDelete}
            className="ui-transition flex items-center gap-1.5 rounded-xl border border-[#e2c2bd] bg-[#f5e7e4] px-3 py-2 text-sm font-medium text-[#8d4944] hover:bg-[#efd8d4]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Supprimer
          </button>
        </div>
      </motion.aside>
    </>
  );
}
