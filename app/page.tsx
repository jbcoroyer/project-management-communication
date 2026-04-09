"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence } from "framer-motion";
import {
  Archive,
  BarChart3,
  CalendarDays,
  ClipboardList,
  KanbanSquare,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { toastError, toastSuccess } from "../lib/toast";
import AppShell from "../components/AppShell";
import NewTaskModal from "../components/NewTaskModal";
import KanbanBoardView from "../components/KanbanBoardView";
import { AdminAvatarContext } from "../lib/adminAvatarContext";
import CommandBar, { type CommandAction } from "../components/CommandBar";
import { mapTaskRow } from "../lib/taskMappers";
import { normalizeProjectName } from "../lib/normalize";
import {
  type ColumnId,
  type Task,
  type NewTaskFormState,
  initialFormState,
} from "../lib/types";
import { useNowInterval } from "../lib/useNowInterval";
import type { TaskFormValuesWithSubtasks } from "../lib/validation/taskSchema";
import { useReferenceData } from "../lib/useReferenceData";
import { useTasks } from "../lib/useTasks";
import { useEvents } from "../lib/useEvents";
import { useCurrentUser } from "../lib/useCurrentUser";
import { completedAtPatchForColumnChange, completedAtIsoForNewTaskInColumn } from "../lib/completedAt";
import { DONE_COLUMN_NAME } from "../lib/workflowConstants";
import { getSupabaseBrowser } from "../lib/supabaseBrowser";
import QuickAiAssistant from "../components/QuickAiAssistant";

/** Délai fixe après lequel une tâche "Terminé" est automatiquement archivée (24h). */
const AUTO_ARCHIVE_DELAY_MS = 24 * 60 * 60 * 1000;

function normalizeProjectedWorkForSave(
  items: Array<{ date: string; hours: number; startTime?: string; endTime?: string }>,
) {
  return (items ?? [])
    .filter((item) => item?.date)
    .map((item) => {
      let hours = Number(item.hours) || 0;
      if (item.startTime && item.endTime) {
        const [sh, sm] = item.startTime.split(":").map(Number);
        const [eh, em] = item.endTime.split(":").map(Number);
        const diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
        if (Number.isFinite(diffMinutes) && diffMinutes > 0) {
          hours = diffMinutes / 60;
        }
      }
      return {
        date: item.date,
        startTime: item.startTime || undefined,
        endTime: item.endTime || undefined,
        hours,
      };
    })
    .filter((item) => item.hours > 0);
}

type MainTab = "kanban" | "todo" | "calendar" | "analytics" | "archives" | "workload";

const MAIN_TABS: { id: MainTab; label: string; icon: typeof KanbanSquare }[] = [
  { id: "todo", label: "Ma To-Do List", icon: ClipboardList },
  { id: "kanban", label: "Tableau Kanban", icon: KanbanSquare },
  { id: "calendar", label: "Calendrier", icon: CalendarDays },
  { id: "workload", label: "Charge équipe", icon: Users },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "archives", label: "Archives", icon: Archive },
];

const ToDoListView = dynamic(() => import("../components/ToDoListView"));
const AnalyticsView = dynamic(() => import("../components/AnalyticsView"));
const ArchivesView = dynamic(() => import("../components/ArchivesView"));
const CalendarView = dynamic(() => import("../components/CalendarView"));
const WorkloadView = dynamic(() => import("../components/WorkloadView"));
const TaskDetailPanel = dynamic(() => import("../components/TaskDetailPanel"));

export default function Home() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const { user: currentUser } = useCurrentUser();
  const { tasks, setTasks, optimisticUpdate, loadTasks } = useTasks();
  const { events: salonEvents } = useEvents();
  const {
    admins: adminRecords,
    columns: columnRecords,
    companies: companyRecords,
    domains: domainRecords,
  } = useReferenceData();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState<NewTaskFormState>(initialFormState);
  const [newTaskColumn, setNewTaskColumn] = useState<ColumnId>("À faire");
  const now = useNowInterval(60_000);

  const [activeTab, setActiveTab] = useState<MainTab>("kanban");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const taskCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lastFocusedTaskIdRef = useRef<string | null>(null);

  const admins = useMemo(() => adminRecords.map((item) => item.name), [adminRecords]);
  const columns = useMemo(() => columnRecords.map((item) => item.name), [columnRecords]);
  const companies = useMemo(() => companyRecords.map((item) => item.name), [companyRecords]);

  const adminAvatarMap = useMemo<Record<string, string | null>>(
    () => Object.fromEntries(adminRecords.map((r) => [r.name, r.avatarUrl ?? null])),
    [adminRecords],
  );

  /** Contexte « qui suis-je » : profil connecté (sidebar) ou premier collaborateur de la liste. */
  const effectiveUser = useMemo(() => {
    const name = currentUser?.teamMemberName ?? currentUser?.displayName ?? null;
    if (name && admins.includes(name)) return name;
    return admins[0] ?? null;
  }, [currentUser, admins]);


  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyFromUrl = () => {
      const p = new URLSearchParams(window.location.search);
      setSearchQuery(p.get("q") ?? "");
    };
    applyFromUrl();
    window.addEventListener("popstate", applyFromUrl);
    return () => window.removeEventListener("popstate", applyFromUrl);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const next = new URLSearchParams();
    if (searchQuery.trim()) next.set("q", searchQuery.trim());
    const current = window.location.search.replace(/^\?/, "");
    const upcoming = next.toString();
    if (current !== upcoming) {
      const suffix = upcoming ? `?${upcoming}` : "";
      window.history.replaceState(null, "", `${window.location.pathname}${suffix}`);
    }
  }, [searchQuery]);

  useEffect(() => {
    void loadTasks().catch(() => {
      toastError("Impossible de charger les tâches. Veuillez réessayer.");
    });
  }, [loadTasks]);

  // Archivage automatique : 24h après l'entrée en « Terminé » (completed_at), pas depuis la création.
  useEffect(() => {
    const toArchive = tasks.filter((t) => {
      if (t.column !== DONE_COLUMN_NAME || t.isArchived || t.parentTaskId) return false;
      const doneMs = t.completedAt ? new Date(t.completedAt).getTime() : 0;
      return doneMs > 0 && Date.now() - doneMs > AUTO_ARCHIVE_DELAY_MS;
    });
    if (toArchive.length === 0) return;
    for (const task of toArchive) {
      void optimisticUpdate(task.id, { ...task, isArchived: true }, { is_archived: true });
    }
  }, [tasks, optimisticUpdate]);

  /** Renvoie le nom du collaborateur par défaut : utilisateur connecté s'il est dans la liste, sinon premier de la liste */
  const defaultAdminName = useMemo(() => {
    const name = currentUser?.teamMemberName ?? currentUser?.displayName ?? null;
    if (name && admins.includes(name)) return name;
    return admins[0] ?? "";
  }, [currentUser, admins]);

  const handleOpenForm = useCallback(() => {
    const firstCompany = companyRecords[0]?.name ?? initialFormState.company;
    const firstDomain = domainRecords[0]?.name ?? initialFormState.domain;
    setEditingTaskId(null);
    setNewTask({
      ...initialFormState,
      company: firstCompany,
      domain: firstDomain,
      admins: defaultAdminName ? [defaultAdminName] : [],
    });
    setNewTaskColumn((columns[0] as ColumnId) ?? "À faire");
    setIsFormOpen(true);
  }, [defaultAdminName, columns, companyRecords, domainRecords]);

  const handleOpenFormForColumn = useCallback(
    (column: ColumnId) => {
      const firstCompany = companyRecords[0]?.name ?? initialFormState.company;
      const firstDomain = domainRecords[0]?.name ?? initialFormState.domain;
      setEditingTaskId(null);
      setNewTask({
        ...initialFormState,
        company: firstCompany,
        domain: firstDomain,
        admins: defaultAdminName ? [defaultAdminName] : [],
      });
      setNewTaskColumn(column);
      setIsFormOpen(true);
    },
    [defaultAdminName, companyRecords, domainRecords],
  );

  const handleCloseForm = () => {
    const firstCompany = companyRecords[0]?.name ?? initialFormState.company;
    const firstDomain = domainRecords[0]?.name ?? initialFormState.domain;
    setIsFormOpen(false);
    setNewTask({
      ...initialFormState,
      company: firstCompany,
      domain: firstDomain,
      admins: defaultAdminName ? [defaultAdminName] : [],
    });
    setNewTaskColumn((columns[0] as ColumnId) ?? "À faire");
  };

  const handleCreateTask = async (values: TaskFormValuesWithSubtasks) => {
    const selectedAdmins = values.admins;
    const normalizedProjectedWork = normalizeProjectedWorkForSave(values.projectedWork ?? []);
    const basePayload = {
      project_name: normalizeProjectName(values.projectName),
      company: values.company,
      domain: values.domain,
      admin: selectedAdmins.join(","),
      is_client_request: values.isClientRequest,
      client_name: values.clientName.trim(),
      deadline: values.deadline || null,
      budget: values.budget.trim(),
      description: values.description.trim(),
      priority: values.priority,
      projected_work: normalizedProjectedWork,
      estimated_hours: parseFloat(values.estimatedHours.replace(",", ".")) || 0,
      estimated_days: parseFloat(values.estimatedDays.replace(",", ".")) || 0,
    };

    if (editingTaskId) {
      const { data, error } = await supabase
        .from("tasks")
        .update(basePayload)
        .eq("id", editingTaskId)
        .select()
        .single();
      if (error) {
        toastError("Impossible de mettre à jour la tâche. Veuillez réessayer.");
        return;
      }
      if (!data) return;
      setTasks((prev) => prev.map((task) => (task.id === editingTaskId ? mapTaskRow(data) : task)));
    } else {
      const payload = {
        ...basePayload,
        column_id: newTaskColumn,
        lane: selectedAdmins[0],
        elapsed_ms: 0,
        is_running: false,
        last_start_time_ms: null,
        is_archived: false,
        completed_at: completedAtIsoForNewTaskInColumn(newTaskColumn),
      };
      const { data, error } = await supabase.from("tasks").insert(payload).select().single();
      if (error) {
        toastError(`Impossible de créer la tâche : ${error.message}`);
        console.error("Erreur création tâche Supabase", error);
        return;
      }
      if (!data) return;
      const newTask = mapTaskRow(data);
      setTasks((prev) => [...prev, newTask]);

      // Créer les sous-tâches planifiées dans le formulaire
      if (values.subtasks && values.subtasks.length > 0) {
        const firstColumn = columns[0] ?? "À faire";
        const subtaskRows = values.subtasks.map((sub) => ({
          project_name: sub.name,
          company: values.company,
          domain: values.domain,
          admin: sub.adminName,
          lane: sub.adminName,
          deadline: sub.deadline || null,
          column_id: firstColumn,
          priority: "Moyenne" as const,
          is_archived: false,
          is_client_request: false,
          parent_task_id: newTask.id,
          estimated_hours: 0,
          estimated_days: 0,
          elapsed_ms: 0,
          is_running: false,
        }));
        const { data: subData, error: subError } = await supabase
          .from("tasks")
          .insert(subtaskRows)
          .select();
        if (subError) {
          toastError(`Sous-tâches non créées : ${subError.message}`);
        } else if (subData) {
          setTasks((prev) => [...prev, ...subData.map(mapTaskRow)]);
        }
      }
    }
    handleCloseForm();
  };

  const openEditForTask = useCallback((task: Task) => {
    setEditingTaskId(task.id);
    setNewTaskColumn(task.column);
    setNewTask({
      projectName: task.projectName,
      company: task.company,
      domain: task.domain,
      admins: task.admins,
      isClientRequest: task.isClientRequest,
      clientName: task.clientName,
      deadline: task.deadline,
      budget: task.budget,
      description: task.description,
      priority: task.priority,
      projectedWork: task.projectedWork?.length ? [...task.projectedWork] : [],
      estimatedHours: task.estimatedHours > 0 ? String(task.estimatedHours) : "",
      estimatedDays: task.estimatedDays > 0 ? String(task.estimatedDays) : "",
    });
    setIsFormOpen(true);
  }, []);

  const handleArchiveTask = (taskId: string) => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Archiver cette tâche ? Elle restera disponible dans l'onglet Archives.",
      );
      if (!confirmed) return;
    }
    const current = tasks.find((task) => task.id === taskId);
    if (!current) return;
    void optimisticUpdate(taskId, { ...current, isArchived: true }, { is_archived: true })
      .then(() => toastSuccess("Tâche archivée"))
      .catch(() => toastError("Impossible d'archiver la tâche. Veuillez réessayer."));
  };

  const handleDeleteTask = async (taskId: string) => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Supprimer définitivement cette tâche ?");
      if (!confirmed) return;
    }
    const previous = tasks;
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    const { data, error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      setTasks(previous);
      const reason = error?.message
        ? `Suppression refusée: ${error.message}`
        : "Suppression refusée: aucune ligne supprimée (RLS ou id introuvable).";
      toastError(reason);
      return;
    }
    toastSuccess("Tâche supprimée");
  };

  const handlePermanentDelete = async (taskId: string) => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Supprimer définitivement cette tâche ? Cette action est irréversible.",
      );
      if (!confirmed) return;
    }
    const previous = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) {
      setTasks(previous);
      toastError(`Suppression impossible : ${error.message}`);
      return;
    }
    toastSuccess("Tâche supprimée définitivement.");
  };

  const handleInlineSave = async (taskId: string, patch: Partial<Task>, dbPatch: Record<string, unknown>) => {
    const current = tasks.find((t) => t.id === taskId);
    if (!current) return;
    const next = { ...current, ...patch };
    setTasks((prev) => prev.map((t) => (t.id === taskId ? next : t)));
    const { error } = await supabase.from("tasks").update(dbPatch).eq("id", taskId);
    if (error) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? current : t)));
      toastError("Impossible de sauvegarder les modifications.");
      return;
    }
    toastSuccess("Tâche mise à jour.");
  };

  const handleRestoreTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    const restorePatch: Record<string, unknown> = { is_archived: false };
    if (task?.column === DONE_COLUMN_NAME) {
      restorePatch.completed_at = new Date().toISOString();
    }
    const { error } = await supabase.from("tasks").update(restorePatch).eq("id", taskId);
    if (error) {
      toastError("Impossible de restaurer la tâche.");
      return;
    }
    const resetAt =
      task?.column === DONE_COLUMN_NAME ? (restorePatch.completed_at as string) : task?.completedAt;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, isArchived: false, completedAt: resetAt ?? t.completedAt }
          : t,
      ),
    );
    toastSuccess("Tâche restaurée");
  };

  const handleMoveTask = useCallback(
    (taskId: string, newColumn: ColumnId) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.column === newColumn) return;
      const colMerge = completedAtPatchForColumnChange(task.column, newColumn);
      const dbPatch: Record<string, unknown> = { column_id: newColumn, ...colMerge };
      const nextCompletedAt =
        "completed_at" in colMerge
          ? colMerge.completed_at === null
            ? undefined
            : colMerge.completed_at
          : task.completedAt;
      void optimisticUpdate(
        taskId,
        { ...task, column: newColumn, completedAt: nextCompletedAt },
        dbPatch,
      ).catch(() => toastError("Impossible de déplacer la tâche. Veuillez réessayer."));
    },
    [tasks, optimisticUpdate],
  );

  const activeTasks = useMemo(() => {
    const roots = tasks.filter((task) => !task.isArchived && !task.parentTaskId);
    const subtaskMap = new Map<string, Task[]>();
    for (const t of tasks) {
      if (t.parentTaskId) {
        const arr = subtaskMap.get(t.parentTaskId) ?? [];
        arr.push(t);
        subtaskMap.set(t.parentTaskId, arr);
      }
    }
    return roots.map((t) => ({ ...t, subtasks: subtaskMap.get(t.id) ?? [] }));
  }, [tasks]);

  const archivedTasks = useMemo(
    () => tasks.filter((task) => task.isArchived && !task.parentTaskId),
    [tasks],
  );

  const filteredActiveTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return activeTasks.filter((task) => {
      if (!query) return true;
      const haystack = [
        task.projectName,
        task.company,
        task.domain,
        task.clientName,
        task.description,
        task.admins.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [activeTasks, searchQuery]);

  const aiContext = useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const normalizeDate = (value: string | undefined) => {
      if (!value) return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      return date;
    };

    const isThisWeek = (value: string | undefined) => {
      const date = normalizeDate(value);
      if (!date) return false;
      return date >= startOfToday && date <= endOfWeek;
    };

    const overdueTasks = activeTasks.filter((task) => {
      const deadline = normalizeDate(task.deadline);
      return deadline != null && deadline < startOfToday;
    });

    const thisWeekTasks = activeTasks.filter((task) => isThisWeek(task.deadline));
    const undatedTasks = activeTasks.filter((task) => !task.deadline);

    const taskBlocks = activeTasks
      .slice()
      .sort((a, b) => {
        const aDate = normalizeDate(a.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const bDate = normalizeDate(b.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      })
      .slice(0, 50)
      .map((task, index) => {
        const adminsLabel = task.admins.length > 0 ? task.admins.join(", ") : "Non assigné";
        const deadlineLabel = task.deadline || "Sans échéance";
        return [
          `--- Tâche #${index + 1} ---`,
          `id: ${task.id}`,
          `Titre exact dans l'app (à citer tel quel): «${task.projectName}»`,
          `Colonne Kanban: ${task.column} | Priorité: ${task.priority} | Échéance: ${deadlineLabel}`,
          `Société: ${task.company} | Responsable(s): ${adminsLabel}`,
        ].join("\n");
      })
      .join("\n\n");

    return [
      "Contexte de pilotage hebdomadaire:",
      `- Date du jour: ${startOfToday.toISOString().slice(0, 10)}`,
      `- Tâches actives: ${activeTasks.length}`,
      `- Tâches en retard: ${overdueTasks.length}`,
      `- Tâches avec deadline cette semaine: ${thisWeekTasks.length}`,
      `- Tâches sans deadline: ${undatedTasks.length}`,
      "",
      "DONNEES — tâches réelles de l'application (tu ne peux citer que ces titres, mot pour mot entre « ») :",
      taskBlocks || "(Aucune tâche active — ne propose aucun plan générique, dis simplement qu'il n'y a pas de tâche.)",
    ].join("\n");
  }, [activeTasks]);

  const selectedTask = useMemo(
    () =>
      selectedTaskId ? (tasks.find((task) => task.id === selectedTaskId) ?? null) : null,
    [selectedTaskId, tasks],
  );

  const closeTaskDetailPanel = useCallback((restoreFocus = true) => {
    const targetTaskId = lastFocusedTaskIdRef.current;
    setSelectedTaskId(null);
    if (!restoreFocus || !targetTaskId) return;
    window.setTimeout(() => {
      taskCardRefs.current[targetTaskId]?.focus();
    }, 0);
  }, []);

  useEffect(() => {
    if (!selectedTaskId) return;
    const exists = tasks.some((task) => task.id === selectedTaskId && !task.isArchived);
    if (!exists) {
      const timeoutId = window.setTimeout(() => {
        closeTaskDetailPanel(false);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [closeTaskDetailPanel, selectedTaskId, tasks]);


  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const inInput =
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target?.isContentEditable;

      if (event.key === "Escape" && selectedTaskId) {
        event.preventDefault();
        closeTaskDetailPanel();
        return;
      }
      if (inInput) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setIsCommandOpen(true);
        return;
      }
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        handleOpenForm();
        return;
      }
      if (event.key === "/") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeTaskDetailPanel, handleOpenForm, selectedTaskId]);

  const commandActions = useMemo<CommandAction[]>(() => {
    const clients = Array.from(
      new Set(
        tasks
          .map((task) => task.clientName?.trim())
          .filter((name): name is string => Boolean(name)),
      ),
    ).slice(0, 8);

    return [
      { id: "new-task", label: "Créer une nouvelle tâche", hint: "N", onSelect: handleOpenForm },
      {
        id: "focus-search",
        label: "Focus recherche",
        hint: "/",
        onSelect: () => searchInputRef.current?.focus(),
      },
      {
        id: "tab-kanban",
        label: "Aller au Tableau Kanban",
        hint: "Tab",
        onSelect: () => setActiveTab("kanban"),
      },
      {
        id: "tab-todo",
        label: "Aller à Ma To-Do List",
        hint: "Tab",
        onSelect: () => setActiveTab("todo"),
      },
      {
        id: "tab-calendar",
        label: "Aller au Calendrier",
        hint: "Tab",
        onSelect: () => setActiveTab("calendar"),
      },
      {
        id: "tab-workload",
        label: "Aller à la Charge équipe",
        hint: "Tab",
        onSelect: () => setActiveTab("workload"),
      },
      {
        id: "tab-analytics",
        label: "Aller aux Analytics",
        hint: "Tab",
        onSelect: () => setActiveTab("analytics"),
      },
      {
        id: "tab-archives",
        label: "Voir les Archives",
        hint: "Tab",
        onSelect: () => setActiveTab("archives"),
      },
      ...clients.map((client) => ({
        id: `search-client-${client}`,
        label: `Rechercher client: ${client}`,
        hint: "Client",
        onSelect: () => setSearchQuery(client),
      })),
    ];
  }, [handleOpenForm, tasks]);


  return (
    <AdminAvatarContext.Provider value={adminAvatarMap}>
    <AppShell
      currentUserName={effectiveUser ?? currentUser?.teamMemberName ?? currentUser?.displayName ?? undefined}
      currentUserEmail={currentUser?.email}
      currentUserAvatarUrl={currentUser?.avatarUrl ?? null}
      currentUserJobTitle={currentUser?.jobTitle ?? null}
      searchSlot={
        <div className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)]/90 px-3 py-2 shadow-[0_8px_24px_rgba(20,17,13,0.05)]">
          <Search className="h-4 w-4 text-[color:var(--foreground)]/45" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une tâche, un admin, une société..."
            aria-label="Rechercher des taches"
            className="ui-focus-ring w-full rounded-md bg-transparent text-sm text-[var(--foreground)] placeholder:text-[color:var(--foreground)]/45 focus:outline-none"
          />
          <kbd className="rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-1.5 py-0.5 text-[10px] text-[color:var(--foreground)]/55">
            ⌘K
          </kbd>
        </div>
      }
      toolbarRight={
        <button
          type="button"
          onClick={handleOpenForm}
          title="Nouvelle tache (N)"
          className="ui-transition inline-flex items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#fffdf9] shadow-[0_14px_30px_rgba(20,17,13,0.18)] hover:-translate-y-0.5 hover:bg-[var(--accent-strong)]"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/25 text-white">
            <Plus className="h-3.5 w-3.5" />
          </span>
          <span>Nouvelle tache</span>
        </button>
      }
    >
      <div className="space-y-5">
        <QuickAiAssistant
          context={aiContext}
        />
        {/* En-tête */}
        <header className="ui-surface rounded-2xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/70">
                Service Communication <span className="font-bold">IDENA</span>
              </p>
              {effectiveUser ? (
                <h1 className="ui-heading mt-1 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                  Bonjour, {effectiveUser.split(" ")[0]} 👋
                </h1>
              ) : (
                <h1 className="ui-heading mt-1 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
                  Tableau de bord
                </h1>
              )}
              <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
                To-Do · Kanban · Calendrier · Charge équipe · Analytics · Archives
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--foreground)]/55">
                {activeTasks.length} tâche{activeTasks.length !== 1 ? "s" : ""} actives
              </span>
              {archivedTasks.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("archives")}
                  className="ui-transition rounded-full border border-dashed border-[var(--line-strong)] bg-[var(--surface-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
                >
                  {archivedTasks.length} archivée{archivedTasks.length !== 1 ? "s" : ""}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Barre d'onglets */}
        <nav
          className="flex items-center gap-1 overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-1"
          aria-label="Onglets principaux"
        >
          {MAIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "ui-transition inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
                  isActive
                    ? tab.id === "todo"
                      ? "bg-[var(--accent)] text-[#fffdf9] shadow-[0_8px_20px_rgba(20,17,13,0.16)]"
                      : "bg-[var(--surface)] text-[var(--foreground)] shadow-[0_1px_2px_rgba(20,17,13,0.08)]"
                    : "text-[color:var(--foreground)]/60 hover:bg-[var(--surface)]",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.id === "archives" && archivedTasks.length > 0 && (
                  <span className="rounded-full bg-[color:var(--foreground)]/12 px-1.5 py-0.5 text-[10px] font-semibold text-[color:var(--foreground)]/80">
                    {archivedTasks.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* ── Onglet : Ma To-Do List ── */}
        {activeTab === "todo" && (
          <ToDoListView
            tasks={activeTasks}
            now={now}
            admins={admins}
            currentUserName={effectiveUser}
            onTaskClick={(task) => setSelectedTaskId(task.id)}
          />
        )}

        {/* ── Onglet : Tableau Kanban ── */}
        {activeTab === "kanban" && (
          <KanbanBoardView
            tasks={filteredActiveTasks}
            columns={columns}
            admins={admins}
            companies={companies}
            companyRecords={companyRecords}
            now={now}
            currentUserName={currentUser?.teamMemberName ?? null}
            onMoveTask={handleMoveTask}
            onOpenTask={setSelectedTaskId}
            onArchiveTask={handleArchiveTask}
            onDeleteTask={(taskId) => void handleDeleteTask(taskId)}
            onEditTask={openEditForTask}
            onAddTaskForColumn={handleOpenFormForColumn}
            taskCardRefs={taskCardRefs}
            lastFocusedTaskIdRef={lastFocusedTaskIdRef}
          />
        )}

        {/* ── Onglet : Calendrier ── */}
        {activeTab === "calendar" && (
          <CalendarView
            tasks={filteredActiveTasks}
            admins={admins}
            currentUserName={currentUser?.teamMemberName ?? null}
            salonEvents={salonEvents}
            onSelectTask={(taskId) => {
              lastFocusedTaskIdRef.current = null;
              setSelectedTaskId(taskId);
            }}
          />
        )}

        {/* ── Onglet : Charge équipe ── */}
        {activeTab === "workload" && (
          <WorkloadView tasks={activeTasks} admins={admins} adminRecords={adminRecords} now={now} />
        )}

        {/* ── Onglet : Analytics ── */}
        {/* Analytics : toutes les taches (actives + archivees) sauf sous-taches */}
        {activeTab === "analytics" && (
          <AnalyticsView tasks={[...activeTasks, ...archivedTasks]} />
        )}

        {/* ── Onglet : Archives ── */}
        {activeTab === "archives" && (
          <ArchivesView
            tasks={tasks}
            admins={admins}
            onRestore={(taskId) => void handleRestoreTask(taskId)}
            onDelete={(taskId) => void handlePermanentDelete(taskId)}
          />
        )}

        {/* Panneau de détail latéral */}
        <AnimatePresence>
          {selectedTask && !selectedTask.isArchived && (
            <TaskDetailPanel
              key={selectedTask.id}
              task={selectedTask}
              allTasks={tasks}
              adminRecords={adminRecords}
              companyRecords={companyRecords}
              domainRecords={domainRecords}
              columnRecords={columnRecords}
              admins={admins}
              columns={columns}
              now={now}
              onClose={closeTaskDetailPanel}
              onSave={handleInlineSave}
              onArchive={() => handleArchiveTask(selectedTask.id)}
              onDelete={() => void handleDeleteTask(selectedTask.id)}
              onSubtaskCreated={(task) => setTasks((prev) => [...prev, task])}
              onSubtaskUpdated={(taskId, patch) =>
                setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)))
              }
              onSubtaskDeleted={(taskId) =>
                setTasks((prev) => prev.filter((t) => t.id !== taskId))
              }
            />
          )}
        </AnimatePresence>
      </div>

      <NewTaskModal
        open={isFormOpen}
        editingTaskId={editingTaskId}
        initialValues={newTask}
        admins={adminRecords}
        companies={companyRecords}
        domains={domainRecords}
        currentUserName={currentUser?.teamMemberName ?? currentUser?.displayName ?? null}
        onCancel={handleCloseForm}
        onSubmit={handleCreateTask}
      />

      <CommandBar
        open={isCommandOpen}
        query={commandQuery}
        onQueryChange={setCommandQuery}
        onClose={() => {
          setIsCommandOpen(false);
          setCommandQuery("");
        }}
        actions={commandActions}
      />
    </AppShell>
    </AdminAvatarContext.Provider>
  );
}
