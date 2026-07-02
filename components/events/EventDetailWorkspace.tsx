"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  Download,
  FileText,
  KanbanSquare,
  PiggyBank,
  Trash2,
  Upload,
  Warehouse,
} from "lucide-react";
import EventBudgetSection from "./EventBudgetSection";
import EventDetailKanban from "./EventDetailKanban";
import EventMaterialNeeds from "./EventMaterialNeeds";
import EventMilestoneBar from "./EventMilestoneBar";
import EventPreparationDashboard from "./EventPreparationDashboard";
import EventRunOfShow from "./EventRunOfShow";
import EventTaskPlanningModal from "./EventTaskPlanningModal";
import EventStockReserve from "./EventStockReserve";
import EventsSectionNav from "./EventsSectionNav";
import { useConfirm } from "../ui/ConfirmDialog";
import type { EventRow } from "../../lib/eventTypes";
import { documentTypes, type EventDocumentType } from "../../lib/eventTypes";
import { computeEventPreparationStats } from "../../lib/eventPreparationStats";
import { eventTaskCategories } from "../../lib/eventTaskCategories";
import type { ColumnId } from "../../lib/types";
import { stockMovementCostEuros } from "../../lib/eventBudget";
import { defaultCompanies, defaultDomains } from "../../lib/types";
import type { Task } from "../../lib/types";
import { getSupabaseBrowser } from "../../lib/supabaseBrowser";
import { formatCurrency, formatInventoryEventItemName, formatNumber } from "../../lib/stockUtils";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { getInventoryErrorMessage } from "../../lib/useInventory";
import { useEventTasks } from "../../lib/useEventTasks";
import { useReferenceData } from "../../lib/useReferenceData";
import { toastError, toastSuccess } from "../../lib/toast";
import { deleteEvent } from "../../app/actions/events";
import { completedAtIsoForNewTaskInColumn, completedAtPatchForColumnChange } from "../../lib/completedAt";
import { markTaskMutatedLocally } from "../../lib/taskMutatedLocally";

type Tab = "tasks" | "stock" | "budget" | "documents";
const EVENT_DOCUMENTS_BUCKET = "event-documents";

type ExpenseDb = {
  id: string;
  created_at: string;
  title: string;
  amount: number;
  category: string;
  quoted_amount?: number | string | null;
  committed_amount?: number | string | null;
  paid_amount?: number | string | null;
  expense_status?: string | null;
  budget_post?: string | null;
  document_path?: string | null;
};

type MovementDb = {
  id: string;
  created_at: string;
  change_amount: number;
  unit_price_at_movement: number | null;
  reason: string | null;
  user_name: string | null;
  inventory_items: {
    name: string | null;
    unit_price: number | string | null;
    category: string | null;
    language: string | null;
  } | null;
};

type EventDocument = {
  path: string;
  name: string;
  createdAt: string | null;
  size: number;
  publicUrl: string;
  docType: EventDocumentType;
  expenseId: string | null;
};

type StorageListItem = {
  name: string;
  created_at?: string | null;
  metadata?: {
    size?: number;
  } | null;
};

function getFileExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  if (idx < 0) return "";
  return name.slice(idx + 1).toLowerCase();
}

function isImageDocument(name: string): boolean {
  return ["png", "jpg", "jpeg", "webp", "gif"].includes(getFileExtension(name));
}

function isPdfDocument(name: string): boolean {
  return getFileExtension(name) === "pdf";
}

type EventDetailWorkspaceProps = {
  eventId: string;
  eventsBasePath?: string;
  kanbanPath?: string;
  showRetexNav?: boolean;
};

export default function EventDetailWorkspace({
  eventId,
  eventsBasePath = "/events",
  kanbanPath = "/dashboard/kanban",
  showRetexNav = false,
}: EventDetailWorkspaceProps) {
  const router = useRouter();
  const id = eventId;
  const { user: currentUser } = useCurrentUser();
  const { tasks, loading: tasksLoading, loadTasks } = useEventTasks(id || null);
  const { admins: teamMemberRecords } = useReferenceData();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>("tasks");
  const [event, setEvent] = useState<EventRow | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [expenses, setExpenses] = useState<ExpenseDb[]>([]);
  const [movements, setMovements] = useState<MovementDb[]>([]);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [milestoneFilterDate, setMilestoneFilterDate] = useState<string | null>(null);
  const [uploadDocType, setUploadDocType] = useState<EventDocumentType>("devis");
  const [documents, setDocuments] = useState<EventDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCategory, setNewTaskCategory] = useState("");

  const loadEvent = useCallback(async () => {
    if (!id) return;
    const supabase = getSupabaseBrowser();
    setLoadingEvent(true);
    try {
      const { data, error } = await supabase
        .from("events")
        .select(
          "id, created_at, name, location, start_date, end_date, status, allocated_budget, budget_posts, template_key, closure_recap",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        setEvent(null);
        return;
      }
      const row = data as Record<string, unknown>;
      setEvent({
        id: String(row.id),
        createdAt: String(row.created_at),
        name: String(row.name ?? ""),
        location: String(row.location ?? ""),
        startDate: String(row.start_date),
        endDate: String(row.end_date),
        status: row.status as EventRow["status"],
        allocatedBudget: Math.max(0, Number(row.allocated_budget ?? 0) || 0),
        budgetPosts:
          row.budget_posts && typeof row.budget_posts === "object" && !Array.isArray(row.budget_posts)
            ? (row.budget_posts as EventRow["budgetPosts"])
            : {},
        templateKey: (row.template_key as string | null) ?? null,
        closureRecap:
          row.closure_recap && typeof row.closure_recap === "object"
            ? (row.closure_recap as EventRow["closureRecap"])
            : null,
      });
    } finally {
      setLoadingEvent(false);
    }
  }, [id]);

  const loadExpensesAndMovements = useCallback(async () => {
    if (!id) return;
    const supabase = getSupabaseBrowser();
    const [exRes, mvRes] = await Promise.all([
      supabase
        .from("expenses")
        .select(
          "id, created_at, title, amount, category, quoted_amount, committed_amount, paid_amount, expense_status, budget_post, document_path",
        )
        .eq("event_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("stock_movements")
        .select(
          "id, created_at, change_amount, unit_price_at_movement, reason, user_name, inventory_items(name, unit_price, category, language)",
        )
        .eq("event_id", id)
        .order("created_at", { ascending: false }),
    ]);
    if (!exRes.error && exRes.data) setExpenses(exRes.data as ExpenseDb[]);
    if (!mvRes.error && mvRes.data) setMovements(mvRes.data as MovementDb[]);
  }, [id]);

  const loadDocuments = useCallback(async () => {
    if (!id) return;
    const supabase = getSupabaseBrowser();
    setLoadingDocuments(true);
    try {
      const { data, error } = await supabase.storage.from(EVENT_DOCUMENTS_BUCKET).list(id, {
        limit: 200,
        sortBy: { column: "created_at", order: "desc" },
      });
      if (error) throw error;
      const { data: metaRows } = await supabase
        .from("event_document_meta")
        .select("storage_path, doc_type, expense_id, title")
        .eq("event_id", id);
      const metaByPath = new Map(
        ((metaRows ?? []) as { storage_path: string; doc_type: string; expense_id: string | null }[]).map(
          (m) => [m.storage_path, m],
        ),
      );

      const rows = ((data ?? []) as StorageListItem[])
        .filter((file) => !!file.name)
        .map((file) => {
          const path = `${id}/${file.name}`;
          const {
            data: { publicUrl },
          } = supabase.storage.from(EVENT_DOCUMENTS_BUCKET).getPublicUrl(path);
          const meta = metaByPath.get(path);
          return {
            path,
            name: file.name,
            createdAt: file.created_at ?? null,
            size: Number(file.metadata?.size ?? 0) || 0,
            publicUrl,
            docType: (meta?.doc_type as EventDocumentType) ?? "autre",
            expenseId: meta?.expense_id ?? null,
          } satisfies EventDocument;
        });
      setDocuments(rows);
    } catch (e) {
      toastError(getInventoryErrorMessage(e, "Impossible de charger les documents de l'événement."));
    } finally {
      setLoadingDocuments(false);
    }
  }, [id]);

  useEffect(() => {
    void loadEvent();
  }, [loadEvent]);

  useEffect(() => {
    void loadExpensesAndMovements();
  }, [loadExpensesAndMovements]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    if (!id) return;
    const supabase = getSupabaseBrowser();
    const ch = supabase
      .channel(`event-workspace-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => {
        void loadExpensesAndMovements();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_movements" }, () => {
        void loadExpensesAndMovements();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, loadExpensesAndMovements]);

  const expenseTotal = useMemo(
    () => expenses.reduce((a, e) => a + Number(e.amount ?? 0), 0),
    [expenses],
  );

  const stockTotal = useMemo(() => {
    return movements.reduce((sum, m) => {
      const fallback = Number(m.inventory_items?.unit_price ?? 0) || 0;
      return (
        sum +
        stockMovementCostEuros({
          changeAmount: m.change_amount,
          unitPriceAtMovement: m.unit_price_at_movement,
          fallbackUnitPrice: fallback,
        })
      );
    }, 0);
  }, [movements]);

  const consumedTotal = expenseTotal + stockTotal;

  const prepStats = useMemo(
    () => (id ? computeEventPreparationStats(id, tasks) : null),
    [id, tasks],
  );

  const filteredTasks = useMemo(() => {
    if (!milestoneFilterDate) return tasks;
    return tasks.filter((t) => t.deadline && t.deadline <= milestoneFilterDate);
  }, [tasks, milestoneFilterDate]);

  const stockCostRows = useMemo(
    () =>
      movements
        .filter((m) => m.change_amount < 0)
        .map((m) => {
          const fallback = Number(m.inventory_items?.unit_price ?? 0) || 0;
          const cost = stockMovementCostEuros({
            changeAmount: m.change_amount,
            unitPriceAtMovement: m.unit_price_at_movement,
            fallbackUnitPrice: fallback,
          });
          return {
            id: m.id,
            label: `Sortie : ${formatInventoryEventItemName(m.inventory_items ?? { name: null })}`,
            cost,
          };
        }),
    [movements],
  );

  const updateTaskDb = useCallback(
    async (taskId: string, dbPatch: Record<string, unknown>) => {
      const supabase = getSupabaseBrowser();
      markTaskMutatedLocally(taskId);
      const { error } = await supabase.from("tasks").update(dbPatch).eq("id", taskId);
      if (error) {
        toastError(getInventoryErrorMessage(error, "Mise à jour impossible."));
        throw error;
      }
      toastSuccess("Tâche mise à jour");
      void loadTasks();
    },
    [loadTasks],
  );

  const [planningTask, setPlanningTask] = useState<Task | null>(null);

  const handleMoveTask = useCallback(
    (taskId: string, newColumn: ColumnId) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.column === newColumn) return;
      void updateTaskDb(task.id, {
        column_id: newColumn,
        ...completedAtPatchForColumnChange(task.column, newColumn),
      }).catch(() => {});
    },
    [tasks, updateTaskDb],
  );

  const defaultUserName =
    currentUser?.teamMemberName ??
    currentUser?.displayName ??
    teamMemberRecords[0]?.name ??
    "";

  const handleDeleteEvent = async () => {
    if (!event || !id) return;
    const ok = await confirm({
      title: `Supprimer l'événement ?`,
      description: (
        <>
          <span className="font-semibold text-[var(--foreground)]">« {event.name} »</span> et{" "}
          <span className="font-semibold text-rose-600">toutes ses tâches</span> seront définitivement
          supprimés. Cette action est irréversible.
        </>
      ),
      confirmLabel: "Supprimer définitivement",
      variant: "destructive",
    });
    if (!ok) return;
    setDeletingEvent(true);
    try {
      const res = await deleteEvent(id);
      if (!res.ok) {
        toastError(res.error);
        return;
      }
      toastSuccess("Événement supprimé");
      router.push(`${eventsBasePath}/dashboard`);
    } finally {
      setDeletingEvent(false);
    }
  };

  const handleUploadDocuments = async (files: FileList | null) => {
    if (!id || !files || files.length === 0) return;
    const supabase = getSupabaseBrowser();
    setUploadingDocuments(true);
    try {
      for (const file of Array.from(files)) {
        const cleanedName = file.name.replace(/[^\w.\-]/g, "_");
        const storagePath = `${id}/${Date.now()}-${cleanedName}`;
        const { error } = await supabase.storage.from(EVENT_DOCUMENTS_BUCKET).upload(storagePath, file, {
          upsert: false,
          contentType: file.type || undefined,
        });
        if (error) throw error;
        await supabase.from("event_document_meta").upsert(
          {
            event_id: id,
            storage_path: storagePath,
            doc_type: uploadDocType,
            title: file.name,
          },
          { onConflict: "storage_path" },
        );
      }
      toastSuccess("Document(s) ajouté(s)");
      await loadDocuments();
    } catch (e) {
      toastError(getInventoryErrorMessage(e, "Upload impossible."));
    } finally {
      setUploadingDocuments(false);
    }
  };

  const handleDeleteDocument = async (doc: EventDocument) => {
    const ok = await confirm({
      title: "Supprimer ce document ?",
      description: (
        <>
          <span className="font-semibold text-[var(--foreground)]">« {doc.name} »</span> sera retiré
          de l&apos;événement.
        </>
      ),
      confirmLabel: "Supprimer",
      variant: "destructive",
    });
    if (!ok) return;
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.storage.from(EVENT_DOCUMENTS_BUCKET).remove([doc.path]);
    if (error) {
      toastError(getInventoryErrorMessage(error, "Suppression impossible."));
      return;
    }
    await supabase.from("event_document_meta").delete().eq("storage_path", doc.path);
    toastSuccess("Document supprimé");
    await loadDocuments();
  };

  const handleCreateEventTask = async () => {
    const title = newTaskTitle.trim();
    if (!id || !title) {
      toastError("Indiquez un intitulé de tâche.");
      return;
    }
    const assignedName =
      teamMemberRecords[0]?.name ??
      currentUser?.teamMemberName ??
      currentUser?.displayName ??
      "";
    if (!assignedName) {
      toastError("Ajoutez au moins un collaborateur actif dans Paramètres.");
      return;
    }
    setCreatingTask(true);
    try {
      const supabase = getSupabaseBrowser();
      const eventDomain = defaultDomains.find((d) => d.includes("Event")) ?? defaultDomains[0];
      const initialColumn = "À faire" as const;
      const { data: createdRow, error } = await supabase
        .from("tasks")
        .insert({
          project_name: title,
          event_category: newTaskCategory.trim() || null,
          event_id: id,
          company: defaultCompanies[0],
          domain: eventDomain,
          admin: assignedName,
          lane: assignedName,
          is_client_request: false,
          client_name: "",
          deadline: null,
          budget: "",
          description: "",
          column_id: initialColumn,
          priority: "Moyenne",
          projected_work: [],
          elapsed_ms: 0,
          is_running: false,
          last_start_time_ms: null,
          is_archived: false,
          estimated_hours: 0,
          estimated_days: 0,
          completed_at: completedAtIsoForNewTaskInColumn(initialColumn),
        })
        .select("id")
        .maybeSingle();
      if (error) throw error;
      markTaskMutatedLocally((createdRow as { id?: string } | null)?.id);
      toastSuccess("Tâche ajoutée");
      setNewTaskTitle("");
      setNewTaskCategory("");
      await loadTasks();
    } catch (e) {
      toastError(getInventoryErrorMessage(e, "Création de la tâche impossible."));
    } finally {
      setCreatingTask(false);
    }
  };

  if (!id) {
    return null;
  }

  return (
    <>
      <div className="space-y-6">
        <Link
          href={`${eventsBasePath}/dashboard`}
          className="ui-transition inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--foreground)]/65 hover:text-[color:var(--foreground)]/75"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au hub
        </Link>

        {loadingEvent ? (
          <p className="text-sm text-[color:var(--foreground)]/55">Chargement…</p>
        ) : !event ? (
          <p className="text-sm text-rose-700">Événement introuvable.</p>
        ) : (
          <>
            <header className="ui-surface rounded-[24px] p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h1 className="ui-heading text-3xl font-semibold text-[var(--foreground)]">{event.name}</h1>
                  <p className="mt-2 text-sm text-[color:var(--foreground)]/60">{event.location}</p>
                  <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
                    {event.startDate} → {event.endDate} · {event.status}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDeleteEvent()}
                  disabled={deletingEvent}
                  className="ui-transition inline-flex shrink-0 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {deletingEvent ? "Suppression…" : "Supprimer l'événement"}
                </button>
              </div>
            </header>

            <EventsSectionNav basePath={eventsBasePath} showRetex={showRetexNav} />

            <EventPreparationDashboard
              event={event}
              tasks={tasks}
              consumedTotal={consumedTotal}
            />

            <EventMilestoneBar
              event={event}
              tasks={tasks}
              activeFilterDate={milestoneFilterDate}
              onFilterMilestone={(dateIso) =>
                setMilestoneFilterDate((prev) => (prev === dateIso ? null : dateIso))
              }
            />

            <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2">
              {(
                [
                  { id: "tasks" as const, label: "Tâches & planning", icon: ClipboardList },
                  { id: "stock" as const, label: "Matériel réservé", icon: Warehouse },
                  { id: "budget" as const, label: "Suivi budgétaire", icon: PiggyBank },
                  { id: "documents" as const, label: "Devis/Facture", icon: FileText },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={[
                      "ui-transition inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold",
                      active ? "bg-[var(--foreground)] text-[var(--accent-contrast)] shadow-sm" : "text-[color:var(--foreground)]/70 hover:bg-[var(--surface-soft)]",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {tab === "tasks" && (
              <div className="space-y-6">
                <section className="ui-surface rounded-[24px] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h2 className="text-lg font-semibold text-[var(--foreground)]">Kanban événement</h2>
                    <Link
                      href={kanbanPath}
                      className="ui-transition inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--foreground)]/70"
                    >
                      <KanbanSquare className="h-4 w-4 text-[var(--accent)]" />
                      Kanban principal
                    </Link>
                  </div>
                  {milestoneFilterDate ? (
                    <p className="mt-2 text-xs font-semibold text-[var(--accent)]">
                      Filtre jalon : échéance ≤ {milestoneFilterDate}{" "}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => setMilestoneFilterDate(null)}
                      >
                        Réinitialiser
                      </button>
                    </p>
                  ) : null}
                  <div className="mt-4 grid gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-3 md:grid-cols-[1fr_180px_auto]">
                    <input
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Ajouter une tâche…"
                      className="ui-focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                    />
                    <select
                      value={newTaskCategory}
                      onChange={(e) => setNewTaskCategory(e.target.value)}
                      className="ui-focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                    >
                      <option value="">Catégorie…</option>
                      {eventTaskCategories.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={creatingTask}
                      onClick={() => void handleCreateEventTask()}
                      className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-60"
                    >
                      {creatingTask ? "Ajout…" : "Ajouter"}
                    </button>
                  </div>
                  <div className="mt-4">
                    {tasksLoading ? (
                      <p className="text-sm text-[color:var(--foreground)]/55">Chargement…</p>
                    ) : (
                      <EventDetailKanban
                        tasks={filteredTasks}
                        onMoveTask={handleMoveTask}
                        onPlanning={(task) => setPlanningTask(task)}
                      />
                    )}
                  </div>
                </section>
                <EventRunOfShow
                  eventId={id}
                  startDate={event.startDate}
                  endDate={event.endDate}
                />
              </div>
            )}

            {tab === "stock" && (
              <section className="space-y-6">
                <EventMaterialNeeds
                  eventId={id}
                  defaultUserName={defaultUserName}
                  onStockChanged={() => void loadExpensesAndMovements()}
                />
                <EventStockReserve eventId={id} defaultUserName={defaultUserName} />
                <div className="ui-surface rounded-[24px] p-5">
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">Sorties de stock imputées</h3>
                  {movements.filter((m) => m.change_amount < 0).length === 0 ? (
                    <p className="mt-3 text-sm text-[color:var(--foreground)]/55">Aucune sortie pour cet événement.</p>
                  ) : (
                    <ul className="mt-4 space-y-2">
                      {movements
                        .filter((m) => m.change_amount < 0)
                        .map((m) => {
                          const fallback = Number(m.inventory_items?.unit_price ?? 0) || 0;
                          const cost = stockMovementCostEuros({
                            changeAmount: m.change_amount,
                            unitPriceAtMovement: m.unit_price_at_movement,
                            fallbackUnitPrice: fallback,
                          });
                          return (
                            <li
                              key={m.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm"
                            >
                              <span className="font-medium text-[var(--foreground)]">
                                {formatInventoryEventItemName(m.inventory_items ?? { name: null })}
                              </span>
                              <span className="text-[color:var(--foreground)]/60">
                                {formatNumber(Math.abs(m.change_amount))} u. · {formatCurrency(cost)}
                              </span>
                            </li>
                          );
                        })}
                    </ul>
                  )}
                </div>
              </section>
            )}

            {tab === "budget" && event && prepStats ? (
              <EventBudgetSection
                event={event}
                expenses={expenses}
                stockRows={stockCostRows}
                consumedTotal={consumedTotal}
                expenseTotal={expenseTotal}
                stockTotal={stockTotal}
                taskProgressPct={prepStats.progressPct}
                onRefresh={() => void loadExpensesAndMovements()}
                onEventUpdated={() => void loadEvent()}
              />
            ) : null}

            {tab === "documents" && (
              <section className="ui-surface rounded-[24px] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">Documents Devis / Facture</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={uploadDocType}
                      onChange={(e) => setUploadDocType(e.target.value as EventDocumentType)}
                      className="ui-focus-ring rounded-xl border border-[var(--line)] px-3 py-2 text-sm"
                    >
                      {documentTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  <label className="ui-transition inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-[var(--accent-contrast)] shadow-sm hover:opacity-90">
                    <Upload className="h-4 w-4" />
                    {uploadingDocuments ? "Upload..." : "Uploader des documents"}
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
                      className="hidden"
                      disabled={uploadingDocuments}
                      onChange={(e) => {
                        void handleUploadDocuments(e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                  </div>
                </div>
                {loadingDocuments ? (
                  <p className="mt-4 text-sm text-[color:var(--foreground)]/55">Chargement…</p>
                ) : documents.length === 0 ? (
                  <p className="mt-4 text-sm text-[color:var(--foreground)]/55">
                    Aucun document pour cet événement.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {documents.map((doc) => (
                      <li
                        key={doc.path}
                        className="grid gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-3 md:grid-cols-[240px_1fr_auto]"
                      >
                        <div className="h-[340px] overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface)]">
                          {isImageDocument(doc.name) ? (
                            <Image
                              src={doc.publicUrl}
                              alt={doc.name}
                              width={240}
                              height={340}
                              sizes="240px"
                              className="h-full w-full object-cover"
                            />
                          ) : isPdfDocument(doc.name) ? (
                            <iframe
                              title={`Prévisualisation ${doc.name}`}
                              src={`${doc.publicUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                              className="h-full w-full"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[11px] font-semibold text-[color:var(--foreground)]/50">
                              Aperçu non disponible
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 self-center">
                          <p className="truncate text-sm font-medium text-[var(--foreground)]">{doc.name}</p>
                          <span className="mt-1 inline-block rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                            {doc.docType}
                          </span>
                          <p className="text-xs text-[color:var(--foreground)]/55">
                            {doc.createdAt ? new Date(doc.createdAt).toLocaleString("fr-FR") : "Date inconnue"} ·{" "}
                            {formatNumber(doc.size / 1024)} Ko
                          </p>
                        </div>
                        <div className="flex items-center gap-2 self-center">
                          <a
                            href={doc.publicUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="ui-transition inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Ouvrir
                          </a>
                          <button
                            type="button"
                            onClick={() => void handleDeleteDocument(doc)}
                            className="ui-transition rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                          >
                            Supprimer
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        )}
      </div>

      <EventTaskPlanningModal
        open={planningTask !== null}
        task={planningTask}
        onClose={() => setPlanningTask(null)}
        onSave={async (items) => {
          if (!planningTask) return;
          await updateTaskDb(planningTask.id, { projected_work: items });
          const { requestOutlookSync } = await import("../../lib/outlookClientSync");
          void requestOutlookSync(planningTask.id);
        }}
      />
    </>
  );
}
