"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import {
  Archive,
  BarChart3,
  CalendarDays,
  ClipboardList,
  Command as CommandIcon,
  Inbox,
  KanbanSquare,
  LayoutTemplate,
  ListFilter,
  PartyPopper,
  Plus,
  Search,
  Table2,
  Users,
} from "lucide-react";
import { toastError, toastSuccess } from "../../../lib/toast";
import { V2ShellSlotSetter } from "../../../lib/v2/shellSlotsContext";
import {
  priorities,
  type ColumnId,
  type Priority,
  type Task,
  type NewTaskFormState,
  initialFormState,
} from "../../../lib/types";
import { useNowInterval } from "../../../lib/useNowInterval";
import { useReferenceData } from "../../../lib/useReferenceData";
import { useTasks } from "../../../lib/useTasks";
import { useEvents } from "../../../lib/useEvents";
import { useCurrentUser } from "../../../lib/useCurrentUser";
import { teamAdminNameForUser } from "../../../lib/taskConcernsUser";
import { getSupabaseBrowser } from "../../../lib/supabaseBrowser";
import { useTaskManager } from "../../../lib/useTaskManager";
import { celebrateTaskManually } from "../../../lib/celebrateTaskDone";
import { DONE_COLUMN_NAME } from "../../../lib/workflowConstants";
import { syncAdminColorAssignments } from "../../../lib/adminColorAssignments";
import { buildAdminFilterList } from "../../../lib/buildAdminFilterList";
import { getAdminColorPaletteSize } from "../../../lib/kanbanStyles";
import { mapTaskRow } from "../../../lib/taskMappers";
import { completedAtIsoForNewTaskInColumn } from "../../../lib/completedAt";
import { markTaskMutatedLocally, markTasksMutatedLocally } from "../../../lib/taskMutatedLocally";
import { normalizeProjectName } from "../../../lib/normalize";
import { useAppShortcuts } from "../../../lib/v2/useAppShortcuts";
import { useInAppNotifications } from "../../../lib/inAppNotificationsContext";
import { usePresence } from "../../../lib/v2/usePresence";
import { useAutomationRules, useAutomationRunner, type AutomationRule } from "../../../lib/v2/automations";
import { useIntakeRequests, type IntakeRequest } from "../../../lib/v2/intake";
import { useAutoArchiveHours } from "../../../lib/v2/v2Preferences";
import { getTemplateById, TASK_TEMPLATES } from "../../../lib/v2/taskTemplates";
import DashboardNotificationBell from "../../DashboardNotificationBell";
import PresenceBar from "../PresenceBar";
import V2CommandPalette, { type PaletteAction } from "./V2CommandPalette";
import V2QuickAddTask from "./V2QuickAddTask";
import V2Inbox from "./V2Inbox";
import V2TriagePanel from "./V2TriagePanel";
import IntakeTaskMappingModal from "./IntakeTaskMappingModal";
import { buildTaskDraftFromRequest, type IntakeTaskDraft } from "../../../lib/v2/intakeMapping";

const V2ListView = dynamic(() => import("../list/V2ListView"));

const KanbanBoardView = dynamic(() => import("../../KanbanBoardView"), {
  loading: () => (
    <div className="grid gap-4 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-[min(70vh,520px)] animate-pulse rounded-2xl bg-[var(--surface-soft)]" />
      ))}
    </div>
  ),
});

type MainTab =
  | "inbox"
  | "kanban"
  | "list"
  | "todo"
  | "calendar"
  | "analytics"
  | "archives"
  | "workload"
  | "triage";
const MAIN_TAB_SET = new Set<MainTab>([
  "inbox",
  "kanban",
  "list",
  "todo",
  "calendar",
  "analytics",
  "archives",
  "workload",
  "triage",
]);

const MAIN_TABS: { id: MainTab; label: string; icon: typeof KanbanSquare }[] = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "todo", label: "Ma To-Do List", icon: ClipboardList },
  { id: "kanban", label: "Tableau Kanban", icon: KanbanSquare },
  { id: "list", label: "Vue liste", icon: Table2 },
  { id: "calendar", label: "Calendrier", icon: CalendarDays },
  { id: "workload", label: "Charge équipe", icon: Users },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "archives", label: "Archives", icon: Archive },
  { id: "triage", label: "Triage", icon: ListFilter },
];

const ToDoListView = dynamic(() => import("../../ToDoListView"));
const AnalyticsView = dynamic(() => import("../../AnalyticsView"));
const ArchivesView = dynamic(() => import("../../ArchivesView"));
const CalendarView = dynamic(() => import("../../CalendarView"));
const WorkloadView = dynamic(() => import("../../WorkloadView"));
const TaskDetailPanel = dynamic(() => import("../../TaskDetailPanel"));
const NewTaskModal = dynamic(() => import("../../NewTaskModal"));

export default function V2DashboardHomePage() {
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

  const { pushNotification } = useInAppNotifications();
  const { rules: automationRules } = useAutomationRules();
  const {
    requests: intakeRequests,
    backend: intakeBackend,
    loading: intakeLoading,
    updateRequest: updateIntakeRequest,
  } = useIntakeRequests();
  const [autoArchiveHours] = useAutoArchiveHours();

  const presenceMembers = usePresence("v2-dashboard", {
    id: currentUser?.id ?? null,
    name: currentUser?.teamMemberName ?? currentUser?.displayName ?? currentUser?.email ?? null,
    avatarUrl: currentUser?.avatarUrl ?? null,
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState<NewTaskFormState>(initialFormState);
  const [newTaskColumn, setNewTaskColumn] = useState<ColumnId>("À faire");
  const now = useNowInterval(60_000);

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") ?? "");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [mappingRequest, setMappingRequest] = useState<IntakeRequest | null>(null);
  const [mappingDraft, setMappingDraft] = useState<IntakeTaskDraft | null>(null);
  const [mappingBusy, setMappingBusy] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const quickAddRef = useRef<HTMLInputElement | null>(null);

  const activeTab = useMemo<MainTab>(() => {
    const match = pathname.match(/^\/v2\/dashboard\/([^/?#]+)/);
    const candidate = match?.[1];
    if (candidate && MAIN_TAB_SET.has(candidate as MainTab)) {
      return candidate as MainTab;
    }
    return "kanban";
  }, [pathname]);

  const navigateToTab = useCallback(
    (tab: MainTab) => {
      const q = searchQuery.trim();
      const next = q ? `/v2/dashboard/${tab}?q=${encodeURIComponent(q)}` : `/v2/dashboard/${tab}`;
      router.push(next);
    },
    [router, searchQuery],
  );

  const taskCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const lastFocusedTaskIdRef = useRef<string | null>(null);

  const admins = useMemo(() => adminRecords.map((item) => item.name), [adminRecords]);

  const filterAdmins = useMemo(
    () => buildAdminFilterList(adminRecords, tasks),
    [adminRecords, tasks],
  );

  useLayoutEffect(() => {
    syncAdminColorAssignments(filterAdmins, getAdminColorPaletteSize());
  }, [filterAdmins]);

  const columns = useMemo(() => columnRecords.map((item) => item.name), [columnRecords]);
  const companies = useMemo(() => companyRecords.map((item) => item.name), [companyRecords]);

  const effectiveUser = useMemo(
    () => teamAdminNameForUser(admins, currentUser),
    [currentUser, admins],
  );

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

  const lastHandledTaskFromUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const taskFromUrl = searchParams.get("task");
    if (!taskFromUrl || tasks.length === 0) return;
    if (lastHandledTaskFromUrlRef.current === taskFromUrl) return;
    if (!tasks.some((t) => t.id === taskFromUrl)) return;
    lastHandledTaskFromUrlRef.current = taskFromUrl;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedTaskId(taskFromUrl);
    const next = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) next.set("q", q);
    const target =
      next.toString().length > 0 ? `/v2/dashboard/kanban?${next.toString()}` : "/v2/dashboard/kanban";
    if (pathname !== "/v2/dashboard/kanban" || searchParams.has("task")) {
      router.replace(target, { scroll: false });
    }
  }, [tasks, searchParams, pathname, router]);

  const defaultAdminName = useMemo(
    () => teamAdminNameForUser(admins, currentUser) ?? "",
    [currentUser, admins],
  );

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

  /** Création rapide « <3 s » : titre seul, valeurs par défaut, ajout optimiste + rollback. */
  const handleQuickCreate = useCallback(
    async (rawTitle: string) => {
      const title = normalizeProjectName(rawTitle);
      if (!title) return;
      const column = (columns[0] as ColumnId) ?? "À faire";
      const firstCompany = companyRecords[0]?.name ?? initialFormState.company;
      const firstDomain = domainRecords[0]?.name ?? initialFormState.domain;
      const admins0 = defaultAdminName ? [defaultAdminName] : [];
      const tempId = `temp-${globalThis.crypto?.randomUUID?.() ?? String(Date.now())}`;
      const nowIso = new Date().toISOString();

      const optimisticTask: Task = {
        id: tempId,
        createdAt: nowIso,
        projectName: title,
        company: firstCompany,
        domain: firstDomain,
        admins: admins0,
        isClientRequest: false,
        clientName: "",
        requestDate: nowIso,
        deadline: "",
        budget: "",
        description: "",
        column,
        priority: "Moyenne",
        projectedWork: [],
        elapsedMs: 0,
        isRunning: false,
        isArchived: false,
        estimatedHours: 0,
        estimatedDays: 0,
        completedAt: completedAtIsoForNewTaskInColumn(column) ?? undefined,
      };
      setTasks((prev) => [...prev, optimisticTask]);

      const payload = {
        project_name: title,
        company: firstCompany,
        domain: firstDomain,
        admin: admins0.join(","),
        is_client_request: false,
        client_name: "",
        deadline: null,
        budget: "",
        description: "",
        priority: "Moyenne" as const,
        projected_work: [],
        estimated_hours: 0,
        estimated_days: 0,
        column_id: column,
        lane: admins0[0] ?? null,
        elapsed_ms: 0,
        is_running: false,
        last_start_time_ms: null,
        is_archived: false,
        completed_at: completedAtIsoForNewTaskInColumn(column),
      };

      const { data, error } = await supabase.from("tasks").insert(payload).select().single();
      if (error || !data) {
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
        toastError(`Impossible de créer la tâche : ${error?.message ?? "erreur inconnue"}`);
        return;
      }
      const created = mapTaskRow(data);
      markTaskMutatedLocally(created.id);
      setTasks((prev) => {
        const cleaned = prev.filter((t) => t.id !== tempId && t.id !== created.id);
        return [...cleaned, created];
      });
      toastSuccess("Tâche créée");
    },
    [columns, companyRecords, domainRecords, defaultAdminName, setTasks, supabase],
  );

  const handleQuickCreateForColumn = useCallback(
    async (rawTitle: string, targetColumn: ColumnId) => {
      const title = normalizeProjectName(rawTitle);
      if (!title) return;
      const column = targetColumn;
      const firstCompany = companyRecords[0]?.name ?? initialFormState.company;
      const firstDomain = domainRecords[0]?.name ?? initialFormState.domain;
      const admins0 = defaultAdminName ? [defaultAdminName] : [];
      const tempId = `temp-${globalThis.crypto?.randomUUID?.() ?? String(Date.now())}`;
      const nowIso = new Date().toISOString();

      const optimisticTask: Task = {
        id: tempId,
        createdAt: nowIso,
        projectName: title,
        company: firstCompany,
        domain: firstDomain,
        admins: admins0,
        isClientRequest: false,
        clientName: "",
        requestDate: nowIso,
        deadline: "",
        budget: "",
        description: "",
        column,
        priority: "Moyenne",
        projectedWork: [],
        elapsedMs: 0,
        isRunning: false,
        isArchived: false,
        estimatedHours: 0,
        estimatedDays: 0,
        completedAt: completedAtIsoForNewTaskInColumn(column) ?? undefined,
      };
      setTasks((prev) => [...prev, optimisticTask]);

      const payload = {
        project_name: title,
        company: firstCompany,
        domain: firstDomain,
        admin: admins0.join(","),
        is_client_request: false,
        client_name: "",
        deadline: null,
        budget: "",
        description: "",
        priority: "Moyenne" as const,
        projected_work: [],
        estimated_hours: 0,
        estimated_days: 0,
        column_id: column,
        lane: admins0[0] ?? null,
        elapsed_ms: 0,
        is_running: false,
        last_start_time_ms: null,
        is_archived: false,
        completed_at: completedAtIsoForNewTaskInColumn(column),
      };

      const { data, error } = await supabase.from("tasks").insert(payload).select().single();
      if (error || !data) {
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
        toastError(`Impossible de créer la tâche : ${error?.message ?? "erreur inconnue"}`);
        return;
      }
      const created = mapTaskRow(data);
      markTaskMutatedLocally(created.id);
      setTasks((prev) => {
        const cleaned = prev.filter((t) => t.id !== tempId && t.id !== created.id);
        return [...cleaned, created];
      });
      toastSuccess("Tâche créée");
    },
    [companyRecords, domainRecords, defaultAdminName, setTasks, supabase],
  );

  const domainNames = useMemo(() => domainRecords.map((d) => d.name), [domainRecords]);

  const runAutomationAction = useCallback(
    (rule: AutomationRule, task: Task) => {
      switch (rule.actionType) {
        case "set_priority": {
          const p = rule.actionParams.priority as Priority | undefined;
          if (p && task.priority !== p) {
            void optimisticUpdate(task.id, { ...task, priority: p }, { priority: p }).catch(() => {});
          }
          break;
        }
        case "move_to_column": {
          const c = rule.actionParams.column as ColumnId | undefined;
          if (c && task.column !== c) handleMoveTask(task.id, c);
          break;
        }
        case "add_assignee": {
          const a = rule.actionParams.assignee;
          if (a && !task.admins.includes(a)) {
            const nextAdmins = [...task.admins, a];
            void optimisticUpdate(task.id, { ...task, admins: nextAdmins }, { admin: nextAdmins.join(",") }).catch(() => {});
          }
          break;
        }
        case "archive": {
          if (!task.isArchived) {
            void optimisticUpdate(task.id, { ...task, isArchived: true }, { is_archived: true }).catch(() => {});
          }
          break;
        }
        case "notify": {
          pushNotification({
            title: rule.name,
            body: rule.actionParams.message || `Automatisation appliquée à « ${task.projectName} »`,
            href: `/v2/dashboard/kanban?task=${task.id}`,
          });
          break;
        }
        default:
          break;
      }
    },
    [handleMoveTask, optimisticUpdate, pushNotification],
  );

  useAutomationRunner({ rules: automationRules, tasks, now, runAction: runAutomationAction });

  useEffect(() => {
    const cutoff = Date.now() - autoArchiveHours * 60 * 60 * 1000;
    const toArchive = tasks.filter(
      (t) =>
        t.column === DONE_COLUMN_NAME &&
        !t.isArchived &&
        !t.parentTaskId &&
        t.completedAt &&
        new Date(t.completedAt).getTime() < cutoff,
    );
    for (const t of toArchive) {
      void optimisticUpdate(t.id, { ...t, isArchived: true }, { is_archived: true }).catch(() => {});
    }
  }, [tasks, autoArchiveHours, optimisticUpdate]);

  const insertTaskRow = useCallback(
    async (payload: Record<string, unknown>): Promise<Task | null> => {
      const { data, error } = await supabase.from("tasks").insert(payload).select().single();
      if (error || !data) {
        toastError(`Création impossible : ${error?.message ?? "erreur inconnue"}`);
        return null;
      }
      const created = mapTaskRow(data);
      markTaskMutatedLocally(created.id);
      setTasks((prev) => {
        const cleaned = prev.filter((t) => t.id !== created.id);
        return [...cleaned, created];
      });
      return created;
    },
    [setTasks, supabase],
  );

  const handleAcceptRequest = useCallback(
    (request: IntakeRequest) => {
      const draft = buildTaskDraftFromRequest(request, {
        companies,
        domains: domainNames,
        admins,
        tasks,
        defaultAdmin: defaultAdminName || undefined,
      });
      setMappingRequest(request);
      setMappingDraft(draft);
    },
    [admins, companies, defaultAdminName, domainNames, tasks],
  );

  const handleConfirmMappedTask = useCallback(
    async (mapped: IntakeTaskDraft) => {
      if (!mappingRequest || mappingBusy) return;
      setMappingBusy(true);
      try {
        const column = (columns[0] as ColumnId) ?? "À faire";
        const created = await insertTaskRow({
          project_name: normalizeProjectName(mapped.projectName),
          company: mapped.company,
          domain: mapped.domain,
          admin: mapped.admins.join(","),
          is_client_request: mapped.isClientRequest,
          client_name: mapped.clientName,
          deadline: mapped.deadline || null,
          budget: mapped.budget,
          description: mapped.description,
          priority: mapped.priority,
          projected_work: [],
          estimated_hours: mapped.estimatedHours,
          estimated_days: mapped.estimatedHours > 0 ? Math.ceil(mapped.estimatedHours / 7) : 0,
          column_id: column,
          lane: mapped.admins[0] ?? null,
          elapsed_ms: 0,
          is_running: false,
          last_start_time_ms: null,
          is_archived: false,
          completed_at: completedAtIsoForNewTaskInColumn(column),
        });
        if (!created) return;
        await updateIntakeRequest(mappingRequest.id, {
          status: "accepted",
          linkedTaskId: created.id,
          decidedAt: new Date().toISOString(),
        });
        setMappingRequest(null);
        setMappingDraft(null);
        toastSuccess("Demande convertie en tâche");
      } finally {
        setMappingBusy(false);
      }
    },
    [columns, insertTaskRow, mappingBusy, mappingRequest, updateIntakeRequest],
  );

  const handleRejectRequest = useCallback(
    async (request: IntakeRequest) => {
      await updateIntakeRequest(request.id, { status: "rejected", decidedAt: new Date().toISOString() });
    },
    [updateIntakeRequest],
  );

  const handleApplyTemplate = useCallback(
    async (templateId: string) => {
      const tpl = getTemplateById(templateId);
      if (!tpl) return;
      const column = (columns[0] as ColumnId) ?? "À faire";
      const firstCompany = companyRecords[0]?.name ?? initialFormState.company;
      const domain = domainNames.includes(tpl.domain)
        ? tpl.domain
        : (domainRecords[0]?.name ?? initialFormState.domain);
      const admins0 = defaultAdminName ? [defaultAdminName] : [];
      const parent = await insertTaskRow({
        project_name: tpl.name,
        company: firstCompany,
        domain,
        admin: admins0.join(","),
        is_client_request: false,
        client_name: "",
        deadline: null,
        budget: "",
        description: tpl.description,
        priority: tpl.priority,
        projected_work: [],
        estimated_hours: 0,
        estimated_days: 0,
        column_id: column,
        lane: admins0[0] ?? null,
        elapsed_ms: 0,
        is_running: false,
        last_start_time_ms: null,
        is_archived: false,
        completed_at: completedAtIsoForNewTaskInColumn(column),
      });
      if (!parent) return;
      const subRows = tpl.subtasks.map((name) => ({
        project_name: name,
        company: firstCompany,
        domain,
        admin: admins0.join(","),
        lane: admins0[0] ?? null,
        deadline: null,
        column_id: column,
        priority: "Moyenne" as const,
        is_archived: false,
        is_client_request: false,
        parent_task_id: parent.id,
        estimated_hours: 0,
        estimated_days: 0,
        elapsed_ms: 0,
        is_running: false,
      }));
      const { data: subData, error: subError } = await supabase.from("tasks").insert(subRows).select();
      if (!subError && subData) {
        const rows = subData as { id: string }[];
        markTasksMutatedLocally(rows.map((r) => r.id).filter(Boolean));
        setTasks((prev) => [...prev, ...subData.map(mapTaskRow)]);
      }
      toastSuccess(`Modèle « ${tpl.name} » appliqué`);
    },
    [columns, companyRecords, defaultAdminName, domainNames, domainRecords, insertTaskRow, setTasks, supabase],
  );

  const pendingTriageCount = useMemo(
    () => intakeRequests.filter((r) => r.status === "triage").length,
    [intakeRequests],
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

  const workloadFlatTasks = useMemo(
    () => tasks.filter((t) => !t.isArchived && t.column !== DONE_COLUMN_NAME),
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

  const selectedTask = useMemo(
    () => (selectedTaskId ? (tasks.find((task) => task.id === selectedTaskId) ?? null) : null),
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

  const focusQuickAdd = useCallback(() => {
    if (activeTab !== "kanban") {
      navigateToTab("kanban");
      window.setTimeout(() => quickAddRef.current?.focus(), 200);
      return;
    }
    if (quickAddRef.current) {
      quickAddRef.current.focus();
    } else {
      handleOpenForm();
    }
  }, [activeTab, handleOpenForm, navigateToTab]);

  const cycleActiveTaskStatus = useCallback(() => {
    const id = selectedTaskId ?? lastFocusedTaskIdRef.current;
    if (!id || columns.length === 0) return;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const idx = columns.indexOf(task.column);
    const nextColumn = columns[(idx + 1) % columns.length] as ColumnId;
    if (nextColumn && nextColumn !== task.column) {
      handleMoveTask(id, nextColumn);
    }
  }, [columns, handleMoveTask, selectedTaskId, tasks]);

  const cycleActiveTaskPriority = useCallback(() => {
    const id = selectedTaskId ?? lastFocusedTaskIdRef.current;
    if (!id) return;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const idx = priorities.indexOf(task.priority);
    const nextPriority = priorities[(idx + 1) % priorities.length];
    if (nextPriority && nextPriority !== task.priority) {
      void handleInlineSave(id, { priority: nextPriority }, { priority: nextPriority });
    }
  }, [handleInlineSave, selectedTaskId, tasks]);

  useAppShortcuts({
    "$mod+k": (event) => {
      event.preventDefault();
      setIsCommandOpen((prev) => !prev);
    },
    "/": (event) => {
      event.preventDefault();
      searchInputRef.current?.focus();
    },
    c: (event) => {
      event.preventDefault();
      focusQuickAdd();
    },
    n: (event) => {
      event.preventDefault();
      handleOpenForm();
    },
    s: (event) => {
      event.preventDefault();
      cycleActiveTaskStatus();
    },
    p: (event) => {
      event.preventDefault();
      cycleActiveTaskPriority();
    },
    "g i": () => navigateToTab("inbox"),
    "g k": () => navigateToTab("kanban"),
    "g l": () => navigateToTab("list"),
    "g t": () => navigateToTab("todo"),
    "g c": () => navigateToTab("calendar"),
    "g w": () => navigateToTab("workload"),
    "g a": () => navigateToTab("analytics"),
    "g r": () => navigateToTab("archives"),
    "g d": () => navigateToTab("triage"),
    Escape: () => {
      if (!isCommandOpen && selectedTaskId) {
        closeTaskDetailPanel();
      }
    },
  });

  const paletteActions = useMemo<PaletteAction[]>(() => {
    const list: PaletteAction[] = [
      {
        id: "quick-add",
        group: "Actions rapides",
        label: "Création rapide de tâche",
        hint: "C",
        keywords: ["nouvelle", "ajouter", "new"],
        perform: focusQuickAdd,
      },
      {
        id: "new-task",
        group: "Actions rapides",
        label: "Nouvelle tâche (détaillée)",
        hint: "N",
        keywords: ["créer", "formulaire"],
        perform: handleOpenForm,
      },
      {
        id: "focus-search",
        group: "Actions rapides",
        label: "Rechercher une tâche",
        hint: "/",
        keywords: ["filtrer", "chercher"],
        perform: () => searchInputRef.current?.focus(),
      },
      {
        id: "confetti",
        group: "Actions rapides",
        label: "Lancer les confettis",
        keywords: ["fun", "célébrer"],
        perform: () => celebrateTaskManually(),
      },
      { id: "nav-inbox", group: "Navigation", label: "Inbox", hint: "G I", perform: () => navigateToTab("inbox") },
      { id: "nav-kanban", group: "Navigation", label: "Tableau Kanban", hint: "G K", perform: () => navigateToTab("kanban") },
      { id: "nav-list", group: "Navigation", label: "Vue liste", hint: "G L", perform: () => navigateToTab("list") },
      { id: "nav-todo", group: "Navigation", label: "Ma To-Do List", hint: "G T", perform: () => navigateToTab("todo") },
      { id: "nav-calendar", group: "Navigation", label: "Calendrier", hint: "G C", perform: () => navigateToTab("calendar") },
      { id: "nav-workload", group: "Navigation", label: "Charge équipe", hint: "G W", perform: () => navigateToTab("workload") },
      { id: "nav-analytics", group: "Navigation", label: "Analytics", hint: "G A", perform: () => navigateToTab("analytics") },
      { id: "nav-archives", group: "Navigation", label: "Archives", hint: "G R", perform: () => navigateToTab("archives") },
      { id: "nav-triage", group: "Navigation", label: "Triage des demandes", hint: "G D", perform: () => navigateToTab("triage") },
      { id: "open-asks", group: "Navigation", label: "Faire une demande", keywords: ["asks", "intake", "demande"], perform: () => router.push("/v2/asks") },
      { id: "open-automations", group: "Navigation", label: "Automatisations (paramètres)", keywords: ["règles", "automation"], perform: () => router.push("/v2/settings") },
      ...TASK_TEMPLATES.map((tpl) => ({
        id: `template-${tpl.id}`,
        group: "Modèles",
        label: `Créer depuis un modèle : ${tpl.name}`,
        keywords: ["template", "bundle", tpl.domain],
        perform: () => void handleApplyTemplate(tpl.id),
      })),
    ];

    const activeId = selectedTaskId ?? lastFocusedTaskIdRef.current;
    const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;
    if (activeTask) {
      const group = `Tâche : ${activeTask.projectName}`;
      for (const col of columns) {
        if (col === activeTask.column) continue;
        list.push({
          id: `status-${col}`,
          group,
          label: `Statut → ${col}`,
          keywords: ["colonne", "déplacer", "statut"],
          perform: () => handleMoveTask(activeTask.id, col as ColumnId),
        });
      }
      for (const prio of priorities) {
        if (prio === activeTask.priority) continue;
        list.push({
          id: `prio-${prio}`,
          group,
          label: `Priorité → ${prio}`,
          keywords: ["priorité"],
          perform: () => void handleInlineSave(activeTask.id, { priority: prio }, { priority: prio }),
        });
      }
      list.push({
        id: "open-active",
        group,
        label: "Ouvrir le détail",
        perform: () => setSelectedTaskId(activeTask.id),
      });
      list.push({
        id: "archive-active",
        group,
        label: "Archiver la tâche",
        perform: () => void handleArchiveTask(activeTask.id),
      });
    }

    const clients = Array.from(
      new Set(
        tasks.map((task) => task.clientName?.trim()).filter((name): name is string => Boolean(name)),
      ),
    ).slice(0, 8);
    for (const client of clients) {
      list.push({
        id: `client-${client}`,
        group: "Recherche",
        label: `Client : ${client}`,
        perform: () => setSearchQuery(client),
      });
    }

    return list;
  }, [
    columns,
    focusQuickAdd,
    handleApplyTemplate,
    handleArchiveTask,
    handleInlineSave,
    handleMoveTask,
    handleOpenForm,
    navigateToTab,
    router,
    selectedTaskId,
    tasks,
  ]);

  return (
    <>
      <V2ShellSlotSetter
        searchSlot={
          <button
            type="button"
            onClick={() => setIsCommandOpen(true)}
            className="flex w-full max-w-md items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-left shadow-[var(--shadow-1)] ui-transition hover:border-[var(--line-strong)]"
          >
            <Search className="h-4 w-4 text-[color:var(--foreground)]/45" aria-hidden />
            <span className="flex-1 text-sm text-[color:var(--foreground)]/45">Rechercher ou lancer une commande…</span>
            <kbd className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-1.5 py-0.5 text-[10px] text-[color:var(--foreground)]/55">
              <CommandIcon className="h-3 w-3" /> K
            </kbd>
          </button>
        }
        toolbarRight={
          <div className="flex shrink-0 items-center gap-2">
            <PresenceBar members={presenceMembers} />
            <button
              type="button"
              onClick={() => celebrateTaskManually()}
              title="Lancer les confettis"
              aria-label="Lancer l’animation de confettis"
              className="ui-transition flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] text-[color:var(--foreground)]/70 shadow-sm hover:border-[var(--line-strong)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
            >
              <PartyPopper className="h-5 w-5" strokeWidth={2} aria-hidden />
            </button>
            <DashboardNotificationBell />
            <button
              type="button"
              onClick={handleOpenForm}
              title="Nouvelle tâche (N)"
              className="ui-transition inline-flex items-center gap-2 rounded-xl border border-[var(--accent)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-contrast)] shadow-[var(--shadow-1)] hover:-translate-y-0.5 hover:bg-[var(--accent-strong)]"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/25 text-white">
                <Plus className="h-3.5 w-3.5" />
              </span>
              <span>Nouvelle tâche</span>
            </button>
          </div>
        }
      />
        <div className="space-y-5">
          <header className="ui-surface rounded-2xl border-l-4 border-l-[var(--accent)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                  Service Communication <span className="font-bold">IDENA</span> · V2
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
                  Palette <kbd className="rounded border border-[var(--line)] bg-[var(--surface-soft)] px-1 text-[10px]">⌘K</kbd>
                  {" · "}Créer <kbd className="rounded border border-[var(--line)] bg-[var(--surface-soft)] px-1 text-[10px]">C</kbd>
                  {" · "}Statut <kbd className="rounded border border-[var(--line)] bg-[var(--surface-soft)] px-1 text-[10px]">S</kbd>
                  {" · "}Priorité <kbd className="rounded border border-[var(--line)] bg-[var(--surface-soft)] px-1 text-[10px]">P</kbd>
                  {" · "}Naviguer <kbd className="rounded border border-[var(--line)] bg-[var(--surface-soft)] px-1 text-[10px]">G</kbd>
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--foreground)]/55">
                  {activeTasks.length} tâche{activeTasks.length !== 1 ? "s" : ""} active{activeTasks.length !== 1 ? "s" : ""}
                </span>
                {archivedTasks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => navigateToTab("archives")}
                    className="ui-transition rounded-full border border-dashed border-[var(--line-strong)] bg-[var(--surface-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
                  >
                    {archivedTasks.length} archivée{archivedTasks.length !== 1 ? "s" : ""}
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
                      ? "bg-[var(--accent)] text-[var(--accent-contrast)] shadow-[var(--shadow-1)]"
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
                  {tab.id === "triage" && pendingTriageCount > 0 && (
                    <span className="rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-contrast)]">
                      {pendingTriageCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {activeTab === "inbox" && (
            <V2Inbox
              tasks={tasks}
              currentUserName={effectiveUser}
              now={now}
              onOpenTask={(taskId) => setSelectedTaskId(taskId)}
            />
          )}

          {activeTab === "triage" && (
            <V2TriagePanel
              requests={intakeRequests}
              backend={intakeBackend}
              loading={intakeLoading}
              tasks={tasks}
              admins={admins}
              onAccept={handleAcceptRequest}
              onReject={(request) => void handleRejectRequest(request)}
              onOpenTask={(taskId) => setSelectedTaskId(taskId)}
            />
          )}

          {activeTab === "todo" && (
            <ToDoListView
              tasks={activeTasks}
              now={now}
              admins={filterAdmins}
              currentUserName={effectiveUser}
              onTaskClick={(task) => setSelectedTaskId(task.id)}
            />
          )}

          {activeTab === "kanban" && (
            <>
              <V2QuickAddTask inputRef={quickAddRef} onQuickAdd={handleQuickCreate} />
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--foreground)]/50">
                  <LayoutTemplate className="h-3.5 w-3.5" /> Modèles :
                </span>
                {TASK_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => void handleApplyTemplate(tpl.id)}
                    title={tpl.description}
                    className="ui-transition rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[color:var(--foreground)]/70 hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>
              <KanbanBoardView
                tasks={filteredActiveTasks}
                columns={columns}
                admins={filterAdmins}
                companies={companies}
                companyRecords={companyRecords}
                now={now}
                currentUserName={effectiveUser}
                onMoveTask={handleMoveTask}
                onOpenTask={setSelectedTaskId}
                onArchiveTask={handleArchiveTask}
                onDeleteTask={(taskId) => void handleDeleteTask(taskId)}
                onEditTask={openEditForTask}
                onAddTaskForColumn={handleOpenFormForColumn}
                taskCardRefs={taskCardRefs}
                lastFocusedTaskIdRef={lastFocusedTaskIdRef}
              />
            </>
          )}

          {activeTab === "list" && (
            <V2ListView
              tasks={filteredActiveTasks}
              columns={columns}
              admins={filterAdmins}
              companies={companies}
              domains={domainNames}
              companyRecords={companyRecords}
              now={now}
              currentUserName={effectiveUser}
              onOpenTask={setSelectedTaskId}
              onMoveTask={handleMoveTask}
              onInlineSave={handleInlineSave}
              onQuickAdd={handleQuickCreateForColumn}
              onEditTask={openEditForTask}
            />
          )}

          {activeTab === "calendar" && (
            <CalendarView
              tasks={filteredActiveTasks}
              admins={filterAdmins}
              currentUserName={effectiveUser}
              salonEvents={salonEvents}
              onSelectTask={(taskId) => {
                lastFocusedTaskIdRef.current = null;
                setSelectedTaskId(taskId);
              }}
            />
          )}

          {activeTab === "workload" && (
            <WorkloadView tasks={workloadFlatTasks} admins={admins} adminRecords={adminRecords} now={now} />
          )}

          {activeTab === "analytics" && <AnalyticsView tasks={analyticsTasks} />}

          {activeTab === "archives" && (
            <ArchivesView
              tasks={tasks}
              admins={filterAdmins}
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
                currentUser={currentUser}
                onClose={closeTaskDetailPanel}
                onSave={handleInlineSave}
                onArchive={() => handleArchiveTask(selectedTask.id)}
                onDelete={() => void handleDeleteTask(selectedTask.id)}
                onSubtaskCreated={(task) => setTasks((prev) => [...prev, task])}
                onSubtaskUpdated={(taskId, patch) =>
                  setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)))
                }
                onSubtaskDeleted={(taskId) => setTasks((prev) => prev.filter((t) => t.id !== taskId))}
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
          currentUserName={effectiveUser ?? currentUser?.teamMemberName ?? currentUser?.displayName ?? null}
          currentUser={currentUser}
          onCancel={handleCloseForm}
          onSubmit={handleCreateTask}
        />

        <V2CommandPalette
          open={isCommandOpen}
          onClose={() => setIsCommandOpen(false)}
          actions={paletteActions}
        />

        <IntakeTaskMappingModal
          open={mappingRequest !== null}
          draft={mappingDraft}
          companies={companies}
          domains={domainNames}
          admins={admins}
          busy={mappingBusy}
          onClose={() => {
            if (mappingBusy) return;
            setMappingRequest(null);
            setMappingDraft(null);
          }}
          onConfirm={(mapped) => void handleConfirmMappedTask(mapped)}
        />
    </>
  );
}
