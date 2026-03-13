"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "../lib/supabaseClient";

const columns = ["Backlog", "À faire", "En cours", "En validation", "Terminé"] as const;

const admins = ["Léna", "Romane", "Alexandre", "Jean-Baptiste"] as const;

const companies = [
  "IDENA",
  "IDENA Nutricion",
  "IDENA Production",
  "IDENA Romania",
  "INDY FEED",
  "SECOPALM",
  "STI biotechnologie",
  "VERTAL",
] as const;

const domains = [
  "🖥️ Digitale",
  "📮 Client",
  "🎟️ Event",
  "🌎 General",
  "🖨️ Print",
  "📰 Presse",
] as const;

type ColumnId = (typeof columns)[number];
type AdminId = (typeof admins)[number];
type Company = (typeof companies)[number];
type Domain = (typeof domains)[number];

type Task = {
  id: string;
  projectName: string;
  company: Company;
  domain: Domain;
  admin: AdminId;
  isClientRequest: boolean;
  clientName: string;
  requestDate: string;
  deadline: string;
  budget: string;
  description: string;
  column: ColumnId;
  lane: AdminId;
  elapsedMs: number;
  isRunning: boolean;
  lastStartTime?: number;
};

type NewTaskFormState = {
  projectName: string;
  company: Company;
  domain: Domain;
  admin: AdminId;
  isClientRequest: boolean;
  clientName: string;
  requestDate: string;
  deadline: string;
  budget: string;
  description: string;
};

const initialFormState: NewTaskFormState = {
  projectName: "",
  company: companies[0],
  domain: domains[0],
  admin: admins[0],
  isClientRequest: false,
  clientName: "",
  requestDate: "",
  deadline: "",
  budget: "",
  description: "",
};

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    seconds.toString().padStart(2, "0"),
  ].join(":");
}

function KanbanCell({
  id,
  hasTasks,
  children,
}: {
  id: string;
  hasTasks: boolean;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div className="flex min-h-[112px] items-stretch">
      <div
        ref={setNodeRef}
        className={[
          "flex w-full flex-col gap-2 rounded-xl border border-dashed bg-white p-2 transition-colors",
          isOver ? "border-blue-400 bg-blue-50/60" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50",
        ].join(" ")}
      >
        {hasTasks ? (
          children
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-[11px] font-medium uppercase tracking-wide text-gray-300">
              Zone de cartes
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanCard({
  task,
  currentNow,
  onToggleTimer,
}: {
  task: Task;
  currentNow: number;
  onToggleTimer: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });

  const style = useMemo(
    () => ({
      transform: transform ? CSS.Translate.toString(transform) : undefined,
      opacity: isDragging ? 0.9 : 1,
      boxShadow: isDragging
        ? "0 12px 25px rgba(15, 23, 42, 0.18)"
        : "0 4px 10px rgba(15, 23, 42, 0.06)",
    }),
    [transform, isDragging],
  );

  const effectiveMs =
    task.elapsedMs +
    (task.isRunning && task.lastStartTime ? Math.max(0, currentNow - task.lastStartTime) : 0);

  return (
    <article
      ref={setNodeRef}
      style={style}
      className="flex cursor-grab flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-800 transition-transform active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{task.projectName || "Projet sans titre"}</h3>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">
            {task.company}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleTimer}
          className={[
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
            task.isRunning
              ? "border-red-500 bg-red-50 text-red-600 hover:bg-red-100"
              : "border-emerald-500 bg-emerald-50 text-emerald-600 hover:bg-emerald-100",
          ].join(" ")}
        >
          <span className="text-[10px]">
            {task.isRunning ? "■" : "▶"}
          </span>
          <span>{task.isRunning ? "Stop" : "Play"}</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
          {task.domain}
        </span>
        <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-medium text-slate-50">
          Admin&nbsp;: {task.admin}
        </span>
        {task.isClientRequest && task.clientName && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
            Client&nbsp;: {task.clientName}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {task.requestDate && (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-gray-400">Date demande</span>
            <span className="font-medium text-gray-700">{task.requestDate}</span>
          </div>
        )}
        {task.deadline && (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-gray-400">Deadline</span>
            <span className="font-medium text-gray-700">{task.deadline}</span>
          </div>
        )}
        {task.budget && (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wide text-gray-400">Budget</span>
            <span className="font-medium text-gray-700">{task.budget}</span>
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wide text-gray-400">Temps passé</span>
          <span className="font-mono text-[11px] text-slate-900">{formatDuration(effectiveMs)}</span>
        </div>
      </div>

      {task.description && (
        <p className="mt-1 line-clamp-3 text-[11px] text-gray-600">{task.description}</p>
      )}
    </article>
  );
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newTask, setNewTask] = useState<NewTaskFormState>(initialFormState);
  const [now, setNow] = useState(() => Date.now());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
  );

  // Chargement initial des tâches depuis Supabase
  useEffect(() => {
    const loadTasks = async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Erreur chargement tâches Supabase", error);
        return;
      }

      const mapped: Task[] =
        data?.map((row: any) => ({
          id: row.id,
          projectName: row.project_name ?? "",
          company: row.company,
          domain: row.domain,
          admin: row.admin,
          isClientRequest: row.is_client_request ?? false,
          clientName: row.client_name ?? "",
          requestDate: row.request_date ?? "",
          deadline: row.deadline ?? "",
          budget: row.budget ?? "",
          description: row.description ?? "",
          column: row.column_id,
          lane: row.lane,
          elapsedMs: row.elapsed_ms ?? 0,
          isRunning: row.is_running ?? false,
          lastStartTime: row.last_start_time_ms ?? undefined,
        })) ?? [];

      setTasks(mapped);
    };

    loadTasks();
  }, []);

  useEffect(() => {
    const hasRunning = tasks.some((t) => t.isRunning);
    if (!hasRunning) return;

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [tasks]);

  const handleToggleTimer = (taskId: string) => {
    setTasks((prev) => {
      const updated = prev.map((task) => {
        if (task.id !== taskId) return task;
        if (!task.isRunning) {
          // Passage en mode Play : on enregistre juste le démarrage localement
          return {
            ...task,
            isRunning: true,
            lastStartTime: Date.now(),
          };
        }
        // Passage en mode Stop : on calcule le temps et on persiste
        const nowStop = Date.now();
        const extra = task.lastStartTime ? Math.max(0, nowStop - task.lastStartTime) : 0;
        const next = {
          ...task,
          isRunning: false,
          lastStartTime: undefined,
          elapsedMs: task.elapsedMs + extra,
        };

        // Mise à jour Supabase (fire-and-forget)
        supabase
          .from("tasks")
          .update({
            elapsed_ms: next.elapsedMs,
            is_running: next.isRunning,
            last_start_time_ms: next.lastStartTime ?? null,
          })
          .eq("id", next.id)
          .then(({ error }) => {
            if (error) console.error("Erreur update timer Supabase", error);
          });

        return next;
      });
      return updated;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const overId = String(over.id);
    const [lane, column] = overId.split("__") as [AdminId | undefined, ColumnId | undefined];
    if (!lane || !column) return;

    const activeId = String(active.id);

    setTasks((prev) => {
      const updated = prev.map((task) =>
        task.id === activeId
          ? {
              ...task,
              lane,
              admin: lane,
              column,
            }
          : task,
      );

      const movedTask = updated.find((t) => t.id === activeId);
      if (movedTask) {
        supabase
          .from("tasks")
          .update({
            lane: movedTask.lane,
            admin: movedTask.admin,
            column_id: movedTask.column,
          })
          .eq("id", movedTask.id)
          .then(({ error }) => {
            if (error) console.error("Erreur update position Supabase", error);
          });
      }

      return updated;
    });
  };

  const handleOpenForm = () => {
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setNewTask(initialFormState);
  };

  const handleFormChange = <K extends keyof NewTaskFormState>(field: K, value: NewTaskFormState[K]) => {
    setNewTask((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateTask = async (event: React.FormEvent) => {
    event.preventDefault();

    const admin = newTask.admin;

    const payload = {
      project_name: newTask.projectName.trim(),
      company: newTask.company,
      domain: newTask.domain,
      admin,
      is_client_request: newTask.isClientRequest,
      client_name: newTask.clientName.trim(),
      request_date: newTask.requestDate || null,
      deadline: newTask.deadline || null,
      budget: newTask.budget.trim(),
      description: newTask.description.trim(),
      column_id: "Backlog" as ColumnId,
      lane: admin,
      elapsed_ms: 0,
      is_running: false,
      last_start_time_ms: null,
    };

    const { data, error } = await supabase
      .from("tasks")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Erreur création tâche Supabase", error);
      return;
    }

    const created: Task = {
      id: data.id,
      projectName: data.project_name ?? "",
      company: data.company,
      domain: data.domain,
      admin: data.admin,
      isClientRequest: data.is_client_request ?? false,
      clientName: data.client_name ?? "",
      requestDate: data.request_date ?? "",
      deadline: data.deadline ?? "",
      budget: data.budget ?? "",
      description: data.description ?? "",
      column: data.column_id,
      lane: data.lane,
      elapsedMs: data.elapsed_ms ?? 0,
      isRunning: data.is_running ?? false,
      lastStartTime: data.last_start_time_ms ?? undefined,
    };

    setTasks((prev) => [...prev, created]);
    handleCloseForm();
  };

  return (
    <main className="min-h-screen bg-gray-100 px-6 py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              Service Communication
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Tableau Kanban avec swimlanes, création de tâches, chronomètre par carte et drag &amp; drop.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenForm}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-400 hover:bg-gray-50"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
              +
            </span>
            <span>Nouvelle tâche</span>
          </button>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="overflow-x-auto">
              <div className="min-w-[960px]">
                {/* En-têtes des colonnes */}
                <div className="grid grid-cols-[200px_repeat(5,minmax(160px,1fr))] gap-3 border-b border-gray-200 pb-3">
                  <div className="px-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                    Collaborateurs
                  </div>
                  {columns.map((col) => (
                    <div
                      key={col}
                      className="rounded-xl bg-gray-50 px-3 py-2 text-center text-sm font-medium text-gray-700"
                    >
                      {col}
                    </div>
                  ))}
                </div>

                {/* Swimlanes */}
                <div className="space-y-3 pt-3">
                  {admins.map((person) => (
                    <div
                      key={person}
                      className="grid grid-cols-[200px_repeat(5,minmax(160px,1fr))] gap-3"
                    >
                      {/* Nom du collaborateur */}
                      <div className="flex items-center px-2 text-sm font-medium text-gray-700">
                        {person}
                      </div>

                      {/* Cellules avec cartes */}
                      {columns.map((col) => {
                        const cellId = `${person}__${col}`;
                        const cellTasks = tasks.filter(
                          (task) => task.lane === person && task.column === col,
                        );

                        return (
                          <KanbanCell
                            key={cellId}
                            id={cellId}
                            hasTasks={cellTasks.length > 0}
                          >
                            {cellTasks.map((task) => (
                              <KanbanCard
                                key={task.id}
                                task={task}
                                currentNow={now}
                                onToggleTimer={() => handleToggleTimer(task.id)}
                              />
                            ))}
                          </KanbanCell>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DndContext>
        </section>
      </div>

      {/* Formulaire de création de tâche */}
      {isFormOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4 py-8">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Nouvelle tâche</h2>
              <button
                type="button"
                onClick={handleCloseForm}
                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <span className="sr-only">Fermer</span>
                ✕
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleCreateTask}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">
                    Nom du projet
                  </label>
                  <input
                    type="text"
                    value={newTask.projectName}
                    onChange={(e) => handleFormChange("projectName", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900/70"
                    placeholder="Ex : Lancement gamme Nutrition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">
                    Société concernée
                  </label>
                  <select
                    value={newTask.company}
                    onChange={(e) =>
                      handleFormChange("company", e.target.value as Company)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900/70"
                  >
                    {companies.map((company) => (
                      <option key={company} value={company}>
                        {company}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">
                    Domaine
                  </label>
                  <select
                    value={newTask.domain}
                    onChange={(e) =>
                      handleFormChange("domain", e.target.value as Domain)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900/70"
                  >
                    {domains.map((domain) => (
                      <option key={domain} value={domain}>
                        {domain}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">
                    Admin (responsable)
                  </label>
                  <select
                    value={newTask.admin}
                    onChange={(e) =>
                      handleFormChange("admin", e.target.value as AdminId)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900/70"
                  >
                    {admins.map((admin) => (
                      <option key={admin} value={admin}>
                        {admin}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">
                    Date de la demande
                  </label>
                  <input
                    type="date"
                    value={newTask.requestDate}
                    onChange={(e) =>
                      handleFormChange("requestDate", e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900/70"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={newTask.deadline}
                    onChange={(e) => handleFormChange("deadline", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900/70"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-700">
                    Budget
                  </label>
                  <input
                    type="text"
                    value={newTask.budget}
                    onChange={(e) => handleFormChange("budget", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900/70"
                    placeholder="Ex : 5 000 €"
                  />
                </div>
              </div>

              <div className="space-y-2 rounded-lg bg-gray-50 p-3">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={newTask.isClientRequest}
                    onChange={(e) =>
                      handleFormChange("isClientRequest", e.target.checked)
                    }
                    className="h-3.5 w-3.5 rounded border-gray-300 text-slate-900 focus:ring-slate-900"
                  />
                  Demande d&apos;un client
                </label>

                {newTask.isClientRequest && (
                  <div className="mt-2 space-y-1.5">
                    <label className="text-xs font-medium text-gray-700">
                      Nom du client
                    </label>
                    <input
                      type="text"
                      value={newTask.clientName}
                      onChange={(e) =>
                        handleFormChange("clientName", e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900/70"
                      placeholder="Ex : Coopérative de l'Ouest"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">
                  Description du projet
                </label>
                <textarea
                  value={newTask.description}
                  onChange={(e) =>
                    handleFormChange("description", e.target.value)
                  }
                  className="min-h-[96px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900/70"
                  placeholder="Notes, objectifs, canaux, contraintes, etc."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="rounded-full px-4 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-slate-900 px-5 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
                >
                  Créer la tâche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
