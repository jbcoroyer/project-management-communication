"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
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
import AppShell from "../../../components/AppShell";
import BudgetGauge from "../../../components/events/BudgetGauge";
import EventTaskPlanningModal from "../../../components/events/EventTaskPlanningModal";
import EventStockReserve from "../../../components/events/EventStockReserve";
import EventsSectionNav from "../../../components/events/EventsSectionNav";
import ExpenseModal from "../../../components/events/ExpenseModal";
import type { EventRow } from "../../../lib/eventTypes";
import { stockMovementCostEuros } from "../../../lib/eventBudget";
import { defaultCompanies, defaultDomains } from "../../../lib/types";
import type { Task } from "../../../lib/types";
import { getSupabaseBrowser } from "../../../lib/supabaseBrowser";
import { formatCurrency, formatInventoryEventItemName, formatNumber } from "../../../lib/stockUtils";
import { useCurrentUser } from "../../../lib/useCurrentUser";
import { getInventoryErrorMessage } from "../../../lib/useInventory";
import { useEventTasks } from "../../../lib/useEventTasks";
import { useReferenceData } from "../../../lib/useReferenceData";
import { toastError, toastSuccess } from "../../../lib/toast";
import { deleteEvent } from "../../actions/events";
import { completedAtIsoForNewTaskInColumn, completedAtPatchForColumnChange } from "../../../lib/completedAt";
import { celebrateTaskDone } from "../../../lib/celebrateTaskDone";
import { markTaskMutatedLocally } from "../../../lib/taskMutatedLocally";

type Tab = "tasks" | "stock" | "budget" | "documents";
const EVENT_DOCUMENTS_BUCKET = "event-documents";

type ExpenseDb = {
  id: string;
  created_at: string;
  title: string;
  amount: number;
  category: string;
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

function TaskDeadlineInput(props: { task: Task; onCommit: (deadline: string) => void }) {
  const { task, onCommit } = props;
  const [v, setV] = useState(task.deadline || "");
  return (
    <input
      type="date"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        const next = v.trim();
        if (next !== (task.deadline || "").trim()) onCommit(next);
      }}
      className="ui-focus-ring max-w-[11rem] rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1.5 text-xs"
    />
  );
}

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { user: currentUser } = useCurrentUser();
  const { tasks, loading: tasksLoading, loadTasks } = useEventTasks(id || null);
  const { admins: teamMemberRecords } = useReferenceData();
  const [tab, setTab] = useState<Tab>("tasks");
  const [event, setEvent] = useState<EventRow | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [expenses, setExpenses] = useState<ExpenseDb[]>([]);
  const [movements, setMovements] = useState<MovementDb[]>([]);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(false);
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
        .select("id, created_at, name, location, start_date, end_date, status, allocated_budget")
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
      });
    } finally {
      setLoadingEvent(false);
    }
  }, [id]);

  const loadExpensesAndMovements = useCallback(async () => {
    if (!id) return;
    const supabase = getSupabaseBrowser();
    const [exRes, mvRes] = await Promise.all([
      supabase.from("expenses").select("id, created_at, title, amount, category").eq("event_id", id).order("created_at", { ascending: false }),
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
      const rows = ((data ?? []) as StorageListItem[])
        .filter((file) => !!file.name)
        .map((file) => {
          const path = `${id}/${file.name}`;
          const {
            data: { publicUrl },
          } = supabase.storage.from(EVENT_DOCUMENTS_BUCKET).getPublicUrl(path);
          return {
            path,
            name: file.name,
            createdAt: file.created_at ?? null,
            size: Number(file.metadata?.size ?? 0) || 0,
            publicUrl,
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

  const defaultUserName =
    currentUser?.teamMemberName ??
    currentUser?.displayName ??
    teamMemberRecords[0]?.name ??
    "";

  const handleDeleteEvent = async () => {
    if (!event || !id) return;
    const ok = window.confirm(
      `Supprimer « ${event.name} » ? Toutes les tâches de cet événement seront supprimées. Cette action est irréversible.`,
    );
    if (!ok) return;
    setDeletingEvent(true);
    try {
      const res = await deleteEvent(id);
      if (!res.ok) {
        toastError(res.error);
        return;
      }
      toastSuccess("Événement supprimé");
      router.push("/events/dashboard");
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
    const ok = window.confirm(`Supprimer le document « ${doc.name} » ?`);
    if (!ok) return;
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.storage.from(EVENT_DOCUMENTS_BUCKET).remove([doc.path]);
    if (error) {
      toastError(getInventoryErrorMessage(error, "Suppression impossible."));
      return;
    }
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
    <AppShell
      currentUserName={currentUser?.displayName ?? currentUser?.teamMemberName ?? currentUser?.email}
      currentUserEmail={currentUser?.email}
      currentUserAvatarUrl={currentUser?.avatarUrl}
      currentUserJobTitle={currentUser?.jobTitle}
    >
      <div className="space-y-6">
        <Link
          href="/events/dashboard"
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

            <EventsSectionNav />

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
                      active ? "bg-[var(--accent)] text-[#fffdf9] shadow-sm" : "text-[color:var(--foreground)]/70 hover:bg-[var(--surface-soft)]",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {tab === "tasks" && (
              <section className="ui-surface rounded-[24px] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">To-do list de l&apos;événement</h2>
                  <Link
                    href="/dashboard/kanban"
                    className="ui-transition inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-xs font-semibold text-[color:var(--foreground)]/70 hover:border-[var(--line-strong)] hover:bg-[var(--surface)]"
                  >
                    <KanbanSquare className="h-4 w-4 text-[var(--accent)]" />
                    Ouvrir le Kanban principal
                  </Link>
                </div>
                <p className="mt-2 text-sm text-[color:var(--foreground)]/55">
                  Les tâches créées ici sont enregistrées comme sur le tableau Kanban : elles apparaissent dans les colonnes
                  « À faire », « En cours », etc., dans la charge de travail et les vues événements.
                </p>
                <div className="mt-4 grid gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-3 md:grid-cols-[1fr_220px_auto]">
                  <input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Ajouter une tâche..."
                    className="ui-focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                  />
                  <input
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value)}
                    placeholder="Catégorie (optionnel)"
                    className="ui-focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={creatingTask}
                    onClick={() => void handleCreateEventTask()}
                    className="ui-transition rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#fffdf9] hover:bg-[var(--accent-strong)] disabled:opacity-60"
                  >
                    {creatingTask ? "Ajout..." : "Ajouter"}
                  </button>
                </div>
                {tasksLoading ? (
                  <p className="mt-4 text-sm text-[color:var(--foreground)]/55">Chargement…</p>
                ) : tasks.length === 0 ? (
                  <p className="mt-4 text-sm text-[color:var(--foreground)]/55">Aucune tâche.</p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {tasks.map((task) => (
                      <li
                        key={task.id}
                        className="grid gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-3 md:grid-cols-[auto_1fr_auto_auto_auto]"
                      >
                        <label className="inline-flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={task.column === "Terminé"}
                            onChange={(e) => {
                              const nextCol = e.target.checked ? "Terminé" : "À faire";
                              const wasTermine = task.column === "Terminé";
                              void (async () => {
                                try {
                                  await updateTaskDb(task.id, {
                                    column_id: nextCol,
                                    ...completedAtPatchForColumnChange(task.column, nextCol),
                                  });
                                  if (nextCol === "Terminé" && !wasTermine) celebrateTaskDone();
                                } catch {
                                  /* toast déjà affiché */
                                }
                              })();
                            }}
                            className="h-4 w-4 rounded border-[var(--line)]"
                          />
                        </label>
                        <div className="min-w-0">
                          <p
                            className={[
                              "truncate text-sm font-semibold text-[var(--foreground)]",
                              task.column === "Terminé" ? "line-through opacity-50" : "",
                            ].join(" ")}
                          >
                            {task.projectName}
                          </p>
                          {task.eventCategory && (
                            <p className="text-xs text-[color:var(--foreground)]/45">{task.eventCategory}</p>
                          )}
                        </div>
                        <select
                          value={task.admins[0] ?? ""}
                          onChange={(e) => {
                            const name = e.target.value;
                            void updateTaskDb(task.id, { admin: name, lane: name || "" }).catch(() => {});
                          }}
                          className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 text-xs"
                        >
                          <option value="">Non assigné</option>
                          {task.admins[0] &&
                            !teamMemberRecords.some((m) => m.name === task.admins[0]) && (
                              <option value={task.admins[0]}>{task.admins[0]} (ancien)</option>
                            )}
                          {teamMemberRecords.map((m) => (
                            <option key={m.id} value={m.name}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                        <TaskDeadlineInput
                          key={`${task.id}-${task.deadline ?? ""}`}
                          task={task}
                          onCommit={(deadline) =>
                            void updateTaskDb(task.id, { deadline: deadline || null }).catch(() => {})
                          }
                        />
                        <button
                          type="button"
                          onClick={() => setPlanningTask(task)}
                          className="ui-transition rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-[11px] font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
                        >
                          Planning
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {tab === "stock" && (
              <section className="space-y-6">
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

            {tab === "budget" && (
              <section className="space-y-6">
                <div className="ui-surface rounded-[24px] p-6">
                  <BudgetGauge allocated={event.allocatedBudget} consumed={consumedTotal} />
                  <button
                    type="button"
                    onClick={() => setExpenseOpen(true)}
                    className="ui-transition mt-6 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#fffdf9] shadow-sm hover:bg-[var(--accent-strong)]"
                  >
                    Ajouter une dépense
                  </button>
                </div>

                <div className="ui-surface rounded-[24px] p-5">
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">Détail des coûts</h3>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-[var(--line)] text-left text-xs uppercase tracking-[0.12em] text-[color:var(--foreground)]/45">
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Libellé</th>
                          <th className="px-3 py-2">Montant</th>
                          <th className="px-3 py-2">Catégorie</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map((ex) => (
                          <tr key={ex.id} className="border-b border-[var(--line)]/80">
                            <td className="px-3 py-2 text-[color:var(--foreground)]/55">Dépense</td>
                            <td className="px-3 py-2 font-medium">{ex.title}</td>
                            <td className="px-3 py-2">{formatCurrency(Number(ex.amount))}</td>
                            <td className="px-3 py-2 text-[color:var(--foreground)]/65">{ex.category}</td>
                          </tr>
                        ))}
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
                              <tr key={m.id} className="border-b border-[var(--line)]/80">
                                <td className="px-3 py-2 text-[color:var(--foreground)]/55">Stock</td>
                                <td className="px-3 py-2 font-medium">
                                  Sortie : {formatInventoryEventItemName(m.inventory_items ?? { name: null })} (
                                  {Math.abs(m.change_amount)} u.)
                                </td>
                                <td className="px-3 py-2">{formatCurrency(cost)}</td>
                                <td className="px-3 py-2 text-[color:var(--foreground)]/65">Matériel</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {tab === "documents" && (
              <section className="ui-surface rounded-[24px] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-[var(--foreground)]">Documents Devis / Facture</h2>
                  <label className="ui-transition inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#fffdf9] shadow-sm hover:bg-[var(--accent-strong)]">
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
                              className="h-full w-full object-cover"
                              unoptimized
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

      <ExpenseModal
        open={expenseOpen}
        eventId={id}
        onClose={() => setExpenseOpen(false)}
        onSaved={() => void loadExpensesAndMovements()}
      />

      <EventTaskPlanningModal
        open={planningTask !== null}
        task={planningTask}
        onClose={() => setPlanningTask(null)}
        onSave={async (items) => {
          if (!planningTask) return;
          await updateTaskDb(planningTask.id, { projected_work: items });
        }}
      />
    </AppShell>
  );
}
