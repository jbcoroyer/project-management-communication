"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { toastError } from "../../lib/toast";
import AppShell from "../AppShell";
import KanbanBoardView from "../KanbanBoardView";
import { AdminAvatarContext } from "../../lib/adminAvatarContext";
import type { CommandAction } from "../CommandBar";
import {
  type ColumnId,
  type Task,
  type NewTaskFormState,
  initialFormState,
} from "../../lib/types";
import { useNowInterval } from "../../lib/useNowInterval";
import { useReferenceData } from "../../lib/useReferenceData";
import { useTasks } from "../../lib/useTasks";
import { useEvents } from "../../lib/useEvents";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { getSupabaseBrowser } from "../../lib/supabaseBrowser";
import { useTaskManager } from "../../lib/useTaskManager";

type MainTab = "kanban" | "todo" | "calendar" | "analytics" | "archives" | "workload";
const MAIN_TAB_SET = new Set<MainTab>(["kanban", "todo", "calendar", "analytics", "archives", "workload"]);

const MAIN_TABS: { id: MainTab; label: string; icon: typeof KanbanSquare }[] = [
  { id: "todo", label: "Ma To-Do List", icon: ClipboardList },
  { id: "kanban", label: "Tableau Kanban", icon: KanbanSquare },
  { id: "calendar", label: "Calendrier", icon: CalendarDays },
  { id: "workload", label: "Charge equipe", icon: Users },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "archives", label: "Archives", icon: Archive },
];

const ToDoListView = dynamic(() => import("../ToDoListView"));
const AnalyticsView = dynamic(() => import("../AnalyticsView"));
const ArchivesView = dynamic(() => import("../ArchivesView"));
const CalendarView = dynamic(() => import("../CalendarView"));
const WorkloadView = dynamic(() => import("../WorkloadView"));
const TaskDetailPanel = dynamic(() => import("../TaskDetailPanel"));
const NewTaskModal = dynamic(() => import("../NewTaskModal"));
const QuickAiAssistant = dynamic(() => import("../QuickAiAssistant"));
const CommandBar = dynamic(() => import("../CommandBar"));

export default function DashboardHomePage() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const activeTab = useMemo<MainTab>(() => {
    const match = pathname.match(/^\/dashboard\/([^/?#]+)/);
    const candidate = match?.[1];
    if (candidate && MAIN_TAB_SET.has(candidate as MainTab)) {
      return candidate as MainTab;
    }
    return "kanban";
  }, [pathname]);

  const navigateToTab = useCallback(
    (tab: MainTab) => {
      const q = searchQuery.trim();
      const next = q ? `/dashboard/${tab}?q=${encodeURIComponent(q)}` : `/dashboard/${tab}`;
      router.push(next);
    },
    [router, searchQuery],
  );

  const taskCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lastFocusedTaskIdRef = useRef<string | null>(null);

  const admins = useMemo(() => adminRecords.map((item) => item.name), [adminRecords]);
  const columns = useMemo(() => columnRecords.map((item) => item.name), [columnRecords]);
  const companies = useMemo(() => companyRecords.map((item) => item.name), [companyRecords]);

  const adminAvatarMap = useMemo<Record<string, string | null>>(
    () => Object.fromEntries(adminRecords.map((r) => [r.name, r.avatarUrl ?? null])),
    [adminRecords],
  );

  const effectiveUser = useMemo(() => {
    const name = currentUser?.teamMemberName ?? currentUser?.displayName ?? null;
    if (name && admins.includes(name)) return name;
    return admins[0] ?? null;
  }, [currentUser, admins]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      const normalized = searchQuery.trim();
      if (normalized) {
        next.set("q", normalized);
      } else {
        next.delete("q");
      }
      const current = searchParams.toString();
      const upcoming = next.toString();
      if (current !== upcoming) {
        const target = upcoming ? `${pathname}?${upcoming}` : pathname;
        router.replace(target, { scroll: false });
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [pathname, router, searchParams, searchQuery]);

  useEffect(() => {
    void loadTasks().catch(() => {
      toastError("Impossible de charger les taches. Veuillez reessayer.");
    });
  }, [loadTasks]);

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

  const handleCloseForm = useCallback(() => {
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
  }, [companyRecords, domainRecords, defaultAdminName, columns]);

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

  const {
    handleCreateTask,
    handleArchiveTask,
    handleDeleteTask,
    handlePermanentDelete,
    handleInlineSave,
    handleRestoreTask,
    handleMoveTask,
  } = useTaskManager({
    supabase,
    tasks,
    setTasks,
    optimisticUpdate,
    columns,
    newTaskColumn,
    editingTaskId,
    onTaskFormDone: handleCloseForm,
  });

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

  const analyticsTasks = useMemo(() => [...activeTasks, ...archivedTasks], [activeTasks, archivedTasks]);
  const taskTitleToId = useMemo(
    () => Object.fromEntries(activeTasks.map((t) => [t.projectName, t.id])),
    [activeTasks],
  );

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
        const adminsLabel = task.admins.length > 0 ? task.admins.join(", ") : "Non assigne";
        const deadlineLabel = task.deadline || "Sans echeance";
        return [
          `--- Tache #${index + 1} ---`,
          `id: ${task.id}`,
          `Titre exact dans l'app (a citer tel quel): «${task.projectName}»`,
          `Colonne Kanban: ${task.column} | Priorite: ${task.priority} | Echeance: ${deadlineLabel}`,
          `Societe: ${task.company} | Responsable(s): ${adminsLabel}`,
        ].join("\n");
      })
      .join("\n\n");

    return [
      "Contexte de pilotage hebdomadaire:",
      `- Date du jour: ${startOfToday.toISOString().slice(0, 10)}`,
      `- Taches actives: ${activeTasks.length}`,
      `- Taches en retard: ${overdueTasks.length}`,
      `- Taches avec deadline cette semaine: ${thisWeekTasks.length}`,
      `- Taches sans deadline: ${undatedTasks.length}`,
      "",
      "DONNEES — taches reelles de l'application (tu ne peux citer que ces titres, mot pour mot entre « ») :",
      taskBlocks || "(Aucune tache active — ne propose aucun plan generique, dis simplement qu'il n'y a pas de tache.)",
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
      { id: "new-task", label: "Creer une nouvelle tache", hint: "N", onSelect: handleOpenForm },
      { id: "focus-search", label: "Focus recherche", hint: "/", onSelect: () => searchInputRef.current?.focus() },
      { id: "tab-kanban", label: "Aller au Tableau Kanban", hint: "Tab", onSelect: () => navigateToTab("kanban") },
      { id: "tab-todo", label: "Aller a Ma To-Do List", hint: "Tab", onSelect: () => navigateToTab("todo") },
      { id: "tab-calendar", label: "Aller au Calendrier", hint: "Tab", onSelect: () => navigateToTab("calendar") },
      { id: "tab-workload", label: "Aller a la Charge equipe", hint: "Tab", onSelect: () => navigateToTab("workload") },
      { id: "tab-analytics", label: "Aller aux Analytics", hint: "Tab", onSelect: () => navigateToTab("analytics") },
      { id: "tab-archives", label: "Voir les Archives", hint: "Tab", onSelect: () => navigateToTab("archives") },
      ...clients.map((client) => ({
        id: `search-client-${client}`,
        label: `Rechercher client: ${client}`,
        hint: "Client",
        onSelect: () => setSearchQuery(client),
      })),
    ];
  }, [handleOpenForm, navigateToTab, tasks]);

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
              placeholder="Rechercher une tache, un admin, une societe..."
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
            taskTitleToId={taskTitleToId}
            onOpenTask={(taskId) => {
              lastFocusedTaskIdRef.current = null;
              setSelectedTaskId(taskId);
            }}
          />
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
                  To-Do · Kanban · Calendrier · Charge equipe · Analytics · Archives
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--foreground)]/55">
                  {activeTasks.length} tache{activeTasks.length !== 1 ? "s" : ""} actives
                </span>
                {archivedTasks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => navigateToTab("archives")}
                    className="ui-transition rounded-full border border-dashed border-[var(--line-strong)] bg-[var(--surface-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
                  >
                    {archivedTasks.length} archivee{archivedTasks.length !== 1 ? "s" : ""}
                  </button>
                )}
              </div>
            </div>
          </header>

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
                  onClick={() => navigateToTab(tab.id)}
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

          {activeTab === "todo" && (
            <ToDoListView
              tasks={activeTasks}
              now={now}
              admins={admins}
              currentUserName={effectiveUser}
              onTaskClick={(task) => setSelectedTaskId(task.id)}
            />
          )}

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

          {activeTab === "workload" && (
            <WorkloadView tasks={activeTasks} admins={admins} adminRecords={adminRecords} now={now} />
          )}

          {activeTab === "analytics" && <AnalyticsView tasks={analyticsTasks} />}

          {activeTab === "archives" && (
            <ArchivesView
              tasks={tasks}
              admins={admins}
              onRestore={(taskId) => void handleRestoreTask(taskId)}
              onDelete={(taskId) => void handlePermanentDelete(taskId)}
            />
          )}

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
