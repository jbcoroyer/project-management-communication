"use client";

import { useMemo, useState } from "react";
import {
  ArchiveRestore,
  CalendarDays,
  FolderArchive,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { domainTagStyles, adminBadgeClassFor } from "../lib/kanbanStyles";
import AdminAvatar from "./AdminAvatar";
import type { Task, AdminId } from "../lib/types";

const PERIODS = [
  { label: "30j", days: 30 },
  { label: "90j", days: 90 },
  { label: "1 an", days: 365 },
  { label: "Tout", days: 0 },
] as const;

export default function ArchivesView(props: {
  tasks: Task[];
  admins: string[];
  onRestore: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filterAdmin, setFilterAdmin] = useState<string>("Tous");
  const [filterCompany, setFilterCompany] = useState<string>("Toutes");
  const [filterDomain, setFilterDomain] = useState<string>("Tous");
  const [filterPeriodDays, setFilterPeriodDays] = useState<number>(0);
  const [showFilters, setShowFilters] = useState(false);
  const [now] = useState(() => Date.now());

  const archivedTasks = useMemo(
    () => props.tasks.filter((t) => t.isArchived && !t.parentTaskId),
    [props.tasks],
  );

  // Valeurs uniques pour les filtres
  const companies = useMemo(
    () => [...new Set(archivedTasks.map((t) => t.company).filter(Boolean))].sort(),
    [archivedTasks],
  );
  const domains = useMemo(
    () => [...new Set(archivedTasks.map((t) => t.domain).filter(Boolean))].sort(),
    [archivedTasks],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return archivedTasks.filter((task) => {
      if (filterAdmin !== "Tous" && !task.admins.includes(filterAdmin)) return false;
      if (filterCompany !== "Toutes" && task.company !== filterCompany) return false;
      if (filterDomain !== "Tous" && task.domain !== filterDomain) return false;
      if (filterPeriodDays > 0) {
        const rawDate = task.createdAt;
        if (!rawDate) return false;
        const createdMs = new Date(rawDate).getTime();
        if (now - createdMs > filterPeriodDays * 24 * 60 * 60 * 1000) return false;
      }
      if (!normalized) return true;
      return [task.projectName, task.company, task.domain, task.description, task.clientName, task.admins.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [archivedTasks, filterAdmin, filterCompany, filterDomain, filterPeriodDays, now, query]);

  const hasActiveFilters =
    filterAdmin !== "Tous" || filterCompany !== "Toutes" || filterDomain !== "Tous" || filterPeriodDays > 0 || query;

  const clearFilters = () => {
    setQuery("");
    setFilterAdmin("Tous");
    setFilterCompany("Toutes");
    setFilterDomain("Tous");
    setFilterPeriodDays(0);
  };

  return (
    <div className="space-y-4">
      {/* ─── En-tête ─── */}
      <div className="ui-surface flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[color:var(--foreground)]/55">
            Historique
          </p>
          <h2 className="ui-heading mt-1 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            Projets archivés
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ui-transition flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
            >
              <X className="h-3.5 w-3.5" />
              Réinitialiser
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={[
              "ui-transition flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition",
              showFilters
                ? "border-[var(--line-strong)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/75"
                : "border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/70 hover:bg-[var(--surface)]",
            ].join(" ")}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtres
          </button>
          <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1 text-xs font-semibold text-[color:var(--foreground)]/75">
            <FolderArchive className="h-3.5 w-3.5" />
            {filtered.length}/{archivedTasks.length}
          </span>
        </div>
      </div>

      {/* ─── Filtres ─── */}
      {showFilters && (
        <div className="ui-surface rounded-2xl p-4 space-y-3">
          {/* Recherche texte */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par nom, société, domaine…"
            className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
          />

          <div className="flex flex-wrap gap-3">
            {/* Période */}
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/55">
                Période
              </p>
              <div className="flex gap-1.5">
                {PERIODS.map(({ label, days }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setFilterPeriodDays(days)}
                    className={[
                      "rounded-lg border px-2.5 py-1 text-xs font-semibold transition",
                      filterPeriodDays === days
                        ? "border-[var(--line-strong)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/75"
                        : "border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/65 hover:bg-[var(--surface)]",
                    ].join(" ")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Collaborateur */}
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/55">
                Collaborateur
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilterAdmin("Tous")}
                  className={[
                    "rounded-lg border px-2.5 py-1 text-xs font-semibold transition",
                    filterAdmin === "Tous"
                      ? "border-[var(--line-strong)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/75"
                      : "border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/65 hover:bg-[var(--surface)]",
                  ].join(" ")}
                >
                  Tous
                </button>
                {props.admins.map((admin) => (
                  <button
                    key={admin}
                    type="button"
                    onClick={() => setFilterAdmin(admin)}
                    className={[
                      "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition",
                      filterAdmin === admin
                        ? adminBadgeClassFor(admin)
                        : "border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/65 hover:bg-[var(--surface)]",
                    ].join(" ")}
                  >
                    <AdminAvatar admin={admin as AdminId} />
                    {admin.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Société */}
            {companies.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/55">
                  Société
                </p>
                <select
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                  className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs"
                >
                  <option value="Toutes">Toutes</option>
                  {companies.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}

            {/* Domaine */}
            {domains.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/55">
                  Domaine
                </p>
                <select
                  value={filterDomain}
                  onChange={(e) => setFilterDomain(e.target.value)}
                  className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs"
                >
                  <option value="Tous">Tous</option>
                  {domains.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Grille des archives ─── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-12 text-center">
          <FolderArchive className="mx-auto h-10 w-10 text-[color:var(--foreground)]/20" />
          <p className="mt-3 text-sm font-medium text-[color:var(--foreground)]/65">
            {archivedTasks.length === 0 ? "Aucune tâche archivée." : "Aucun résultat pour ces filtres."}
          </p>
          <p className="mt-1 text-xs text-[color:var(--foreground)]/45">
            {archivedTasks.length === 0
              ? "Votre tableau est propre. Créez une nouvelle tâche depuis le dashboard."
              : "Essayez d'élargir la période ou de réinitialiser les filtres."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((task) => (
            <article
              key={task.id}
              className="flex flex-col rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-[0_8px_18px_rgba(20,17,13,0.07)]"
            >
              <h3 className="text-base font-semibold tracking-tight text-[var(--foreground)]">
                {task.projectName || "Sans titre"}
              </h3>
              <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-[color:var(--foreground)]/55">
                {task.company}
              </p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <span
                  className={[
                    "rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                    domainTagStyles[task.domain] ?? domainTagStyles.default,
                  ].join(" ")}
                >
                  {task.domain}
                </span>
                <span className="rounded-md border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--foreground)]/75">
                  {task.column}
                </span>
                {task.admins.map((admin) => (
                  <span
                    key={admin}
                    className={[
                      "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                      adminBadgeClassFor(admin),
                    ].join(" ")}
                  >
                    <AdminAvatar admin={admin as AdminId} />
                    {admin.split(" ")[0]}
                  </span>
                ))}
              </div>

              {task.deadline && (
                <p className="mt-2 flex items-center gap-1 text-[11px] text-[color:var(--foreground)]/60">
                  <CalendarDays className="h-3 w-3 shrink-0" />
                  {task.deadline}
                </p>
              )}

              {task.description && (
                <p className="mt-1.5 line-clamp-2 text-xs text-[color:var(--foreground)]/65">
                  {task.description}
                </p>
              )}

              {/* Actions */}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => props.onRestore(task.id)}
                  className="ui-transition flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
                >
                  <ArchiveRestore className="h-3.5 w-3.5" />
                  Restaurer
                </button>
                <button
                  type="button"
                  onClick={() => props.onDelete(task.id)}
                  className="ui-transition flex items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                  title="Supprimer définitivement"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
