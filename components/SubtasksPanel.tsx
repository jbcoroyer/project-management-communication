"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  ListChecks,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { getSupabaseBrowser } from "../lib/supabaseBrowser";
import AdminAvatar from "./AdminAvatar";
import type { Task, AdminId, ColumnId } from "../lib/types";
import { adminBadgeClassFor } from "../lib/kanbanStyles";
import { completedAtPatchForColumnChange } from "../lib/completedAt";
import { DONE_COLUMN_NAME } from "../lib/workflowConstants";

/* ─── Mini formulaire inline pour ajouter une sous-tâche ─── */
function AddSubtaskForm(props: {
  parentId: string;
  parentCompany: string;
  parentDomain: string;
  admins: string[];
  columns: string[];
  onCreated: (task: Task) => void;
  onCancel: () => void;
}) {
  const supabase = getSupabaseBrowser();
  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState(props.admins[0] ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Nom requis."); return; }
    setSaving(true);
    setError(null);

    const insertPayload = {
      project_name: name.trim().charAt(0).toUpperCase() + name.trim().slice(1).toLowerCase(),
      company: props.parentCompany,
      domain: props.parentDomain,
      admin: selectedAdmin,
      lane: selectedAdmin,
      deadline: deadline || null,
      column_id: props.columns[0] ?? "À faire",
      priority: "Moyenne",
      is_archived: false,
      is_client_request: false,
      parent_task_id: props.parentId,
      estimated_hours: 0,
      estimated_days: 0,
      elapsed_ms: 0,
      is_running: false,
    };

    const { data, error: insertError } = await supabase
      .from("tasks")
      .insert(insertPayload)
      .select("*, parent_task_id")
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? "Erreur lors de la création.");
      setSaving(false);
      return;
    }

    const { mapTaskRow } = await import("../lib/taskMappers");
    props.onCreated(mapTaskRow(data));
    setSaving(false);
  };

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="rounded-xl border border-[var(--line)]/85 bg-[var(--surface-soft)] p-3"
    >
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/50">
        Nouvelle étape
      </p>
      <div className="space-y-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom de l'étape…"
          className="ui-focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="ui-focus-ring flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
          <select
            value={selectedAdmin}
            onChange={(e) => setSelectedAdmin(e.target.value)}
            className="ui-focus-ring flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
          >
            {props.admins.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-xs text-rose-600">{error}</p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="ui-transition flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#fffdf9] hover:bg-[var(--accent-strong)] disabled:opacity-60"
        >
          <Plus className="h-3.5 w-3.5" />
          {saving ? "Ajout…" : "Ajouter"}
        </button>
        <button
          type="button"
          onClick={props.onCancel}
          className="ui-transition flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[color:var(--foreground)]/70 hover:bg-[var(--surface-soft)]"
        >
          <X className="h-3.5 w-3.5" />
          Annuler
        </button>
      </div>
    </form>
  );
}

/* ─── Ligne d'une sous-tâche ─── */
function SubtaskRow(props: {
  subtask: Task;
  now: number;
  columns: string[];
  onMarkDone: () => void;
  onDelete: () => void;
  onColumnChange: (col: ColumnId) => void;
}) {
  const { subtask, now } = props;
  const deadlineMs = subtask.deadline ? new Date(subtask.deadline + "T23:59:59").getTime() : 0;
  const isOverdue = deadlineMs > 0 && now > deadlineMs;
  const isDone = subtask.column === DONE_COLUMN_NAME;

  return (
    <div
      className={[
        "flex items-center gap-2.5 rounded-xl border px-3 py-2.5",
        isDone
          ? "border-emerald-200 bg-emerald-50/50 opacity-70"
          : isOverdue
            ? "border-rose-200 bg-rose-50/40"
            : "border-[var(--line)] bg-[var(--surface)]",
      ].join(" ")}
    >
      {/* Bouton "Terminé" */}
      <button
        type="button"
        onClick={props.onMarkDone}
        title={isDone ? "Déjà terminé" : "Marquer terminé"}
        className={[
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
          isDone
            ? "border-emerald-400 bg-emerald-100 text-emerald-600"
            : "border-[var(--line)] bg-[var(--surface-soft)] hover:border-emerald-400 hover:bg-emerald-50",
        ].join(" ")}
      >
        {isDone && <Check className="h-3 w-3" />}
      </button>

      {/* Nom */}
      <p
        className={[
          "min-w-0 flex-1 text-sm",
          isDone ? "text-[color:var(--foreground)]/50 line-through" : "font-medium text-[var(--foreground)]",
        ].join(" ")}
      >
        {subtask.projectName || "Sans titre"}
      </p>

      {/* Admin */}
      {subtask.admins[0] && (
        <span
          className={[
            "hidden shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold sm:inline-flex",
            adminBadgeClassFor(subtask.admins[0] ?? ""),
          ].join(" ")}
        >
          <AdminAvatar admin={subtask.admins[0] as AdminId} />
          {subtask.admins[0].split(" ")[0]}
        </span>
      )}

      {/* Deadline */}
      {subtask.deadline && (
        <span
          className={[
            "hidden shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] sm:inline-flex",
            isOverdue
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/65",
          ].join(" ")}
        >
          <CalendarDays className="h-3 w-3 shrink-0" />
          {subtask.deadline}
        </span>
      )}

      {/* Sélecteur de colonne */}
      <select
        value={subtask.column}
        onChange={(e) => props.onColumnChange(e.target.value)}
        className="hidden rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1 text-[11px] sm:block"
      >
        {props.columns.map((col) => (
          <option key={col} value={col}>{col}</option>
        ))}
      </select>

      {/* Suppression */}
      <button
        type="button"
        onClick={props.onDelete}
        title="Supprimer cette étape"
        className="ui-transition flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] text-rose-400 hover:bg-rose-50 hover:text-rose-600"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ─── Panneau principal ─── */
export default function SubtasksPanel(props: {
  parentTask: Task;
  allTasks: Task[];
  admins: string[];
  columns: string[];
  now: number;
  onSubtaskCreated: (task: Task) => void;
  onSubtaskUpdated: (taskId: string, patch: Partial<Task>, dbPatch: Record<string, unknown>) => void;
  onSubtaskDeleted: (taskId: string) => void;
}) {
  const supabase = getSupabaseBrowser();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const subtasks = useMemo(
    () => props.allTasks.filter((t) => t.parentTaskId === props.parentTask.id),
    [props.allTasks, props.parentTask.id],
  );

  const doneCount = subtasks.filter((t) => t.column === DONE_COLUMN_NAME).length;
  const total = subtasks.length;
  const progressPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const handleMarkDone = async (subtask: Task) => {
    if (subtask.column === DONE_COLUMN_NAME) return;
    const colMerge = completedAtPatchForColumnChange(subtask.column, DONE_COLUMN_NAME);
    const patch: Partial<Task> = { column: DONE_COLUMN_NAME };
    if ("completed_at" in colMerge) {
      patch.completedAt = colMerge.completed_at === null ? undefined : colMerge.completed_at;
    }
    const dbPatch = { column_id: DONE_COLUMN_NAME, ...colMerge };
    props.onSubtaskUpdated(subtask.id, patch, dbPatch);
    await supabase.from("tasks").update(dbPatch).eq("id", subtask.id);
  };

  const handleColumnChange = async (subtask: Task, col: ColumnId) => {
    const colMerge = completedAtPatchForColumnChange(subtask.column, col);
    const patch: Partial<Task> = { column: col };
    if ("completed_at" in colMerge) {
      patch.completedAt = colMerge.completed_at === null ? undefined : colMerge.completed_at;
    }
    const dbPatch = { column_id: col, ...colMerge };
    props.onSubtaskUpdated(subtask.id, patch, dbPatch);
    await supabase.from("tasks").update(dbPatch).eq("id", subtask.id);
  };

  const handleDelete = async (subtaskId: string) => {
    const confirmed =
      typeof window !== "undefined"
        ? window.confirm("Supprimer cette étape définitivement ?")
        : true;
    if (!confirmed) return;
    props.onSubtaskDeleted(subtaskId);
    await supabase.from("tasks").delete().eq("id", subtaskId);
  };

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)]">
      {/* En-tête */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-[color:var(--foreground)]/50" />
          <span className="text-sm font-semibold text-[var(--foreground)]">
            Étapes / Sous-tâches
          </span>
          {total > 0 && (
            <span className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--foreground)]/75">
              {doneCount}/{total}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-[color:var(--foreground)]/50" />
        ) : (
          <ChevronDown className="h-4 w-4 text-[color:var(--foreground)]/50" />
        )}
      </button>

      {/* Barre de progression (visible même fermé si > 0) */}
      {total > 0 && (
        <div className="mx-4 h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-2">
          {subtasks.length === 0 && !showForm && (
            <p className="py-2 text-center text-xs text-[color:var(--foreground)]/45">
              Aucune étape. Ajoutez des sous-tâches pour décomposer ce projet.
            </p>
          )}

          {/* Tri : non-terminées en premier, puis par deadline */}
          {[...subtasks]
            .sort((a, b) => {
              if ((a.column === DONE_COLUMN_NAME) !== (b.column === DONE_COLUMN_NAME))
                return a.column === DONE_COLUMN_NAME ? 1 : -1;
              const da = a.deadline ? new Date(a.deadline).getTime() : Infinity;
              const db = b.deadline ? new Date(b.deadline).getTime() : Infinity;
              return da - db;
            })
            .map((sub) => (
              <SubtaskRow
                key={sub.id}
                subtask={sub}
                now={props.now}
                columns={props.columns}
                onMarkDone={() => void handleMarkDone(sub)}
                onDelete={() => void handleDelete(sub.id)}
                onColumnChange={(col) => void handleColumnChange(sub, col)}
              />
            ))}

          {showForm ? (
            <AddSubtaskForm
              parentId={props.parentTask.id}
              parentCompany={props.parentTask.company}
              parentDomain={props.parentTask.domain}
              admins={props.admins}
              columns={props.columns}
              onCreated={(task) => {
                props.onSubtaskCreated(task);
                setShowForm(false);
              }}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="ui-transition mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--line)] py-2.5 text-xs font-semibold text-[color:var(--foreground)]/60 hover:border-[var(--line-strong)] hover:text-[color:var(--foreground)]/50"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter une étape
            </button>
          )}
        </div>
      )}
    </div>
  );
}
