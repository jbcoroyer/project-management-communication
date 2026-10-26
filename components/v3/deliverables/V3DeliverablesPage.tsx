"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  Copy,
  ExternalLink,
  FileText,
  Filter,
  PackageCheck,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { TuesdayLoader } from "@/components/brand";
import V2PageHeader from "../../v2/V2PageHeader";
import DeliverableFormModal from "../../deliverables/DeliverableFormModal";
import { useDeliverables } from "../../../lib/useDeliverables";
import { useReferenceData } from "../../../lib/useReferenceData";
import { useCurrentUser } from "../../../lib/useCurrentUser";
import {
  isPdfDeliverable,
  type CreateDeliverableInput,
  type Deliverable,
  type UpdateDeliverableInput,
} from "../../../lib/deliverables";
import { pdfEmbedSrc } from "../../../lib/stockVisualUtils";
import { toastSuccess } from "../../../lib/toast";
import { useConfirm } from "../../ui/ConfirmDialog";

function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

function monthLabel(key: string): string {
  try {
    return format(parseISO(`${key}-01`), "MMMM yyyy", { locale: fr });
  } catch {
    return key;
  }
}

export default function V3DeliverablesPage() {
  const { items, loading, add, update, remove } = useDeliverables();
  const { companies } = useReferenceData();
  const { user } = useCurrentUser();
  const confirm = useConfirm();

  const [manualOpen, setManualOpen] = useState(false);
  const [editing, setEditing] = useState<Deliverable | null>(null);
  const [companyFilter, setCompanyFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "name">("newest");

  const months = useMemo(() => {
    const set = new Set(items.map((d) => monthKey(d.completedAt)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [items]);

  const companyNames = useMemo(() => {
    const set = new Set(items.map((d) => d.company).filter(Boolean));
    companies.forEach((c) => set.add(c.name));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [items, companies]);

  const filtered = useMemo(() => {
    let list = [...items];
    if (companyFilter !== "all") list = list.filter((d) => d.company === companyFilter);
    if (monthFilter !== "all") list = list.filter((d) => monthKey(d.completedAt) === monthFilter);
    list.sort((a, b) => {
      if (sort === "name") return a.projectName.localeCompare(b.projectName, "fr");
      const diff = a.completedAt.localeCompare(b.completedAt);
      return sort === "newest" ? -diff : diff;
    });
    return list;
  }, [items, companyFilter, monthFilter, sort]);

  const grouped = useMemo(() => {
    const map = new Map<string, Deliverable[]>();
    for (const item of filtered) {
      const key = monthKey(item.completedAt);
      const bucket = map.get(key) ?? [];
      bucket.push(item);
      map.set(key, bucket);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const saveCreate = async (input: CreateDeliverableInput | UpdateDeliverableInput) => {
    const created = await add(input as CreateDeliverableInput);
    return Boolean(created);
  };

  const saveEdit = async (input: CreateDeliverableInput | UpdateDeliverableInput) => {
    if (!editing) return false;
    const updated = await update(editing, input as UpdateDeliverableInput);
    return Boolean(updated);
  };

  const copyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      toastSuccess("Chemin copié");
    } catch {
      toastSuccess(path);
    }
  };

  const onDelete = async (item: Deliverable) => {
    const ok = await confirm({
      title: "Supprimer ce livrable ?",
      description: item.projectName,
      confirmLabel: "Supprimer",
      variant: "destructive",
    });
    if (ok) await remove(item);
  };

  return (
    <div className="space-y-6">
      <V2PageHeader
        kicker="Travail"
        icon={PackageCheck}
        title="Livrables"
        description="Centralisez les rendus terminés : visuels, entité et emplacement serveur."
        aside={
          <button type="button" onClick={() => setManualOpen(true)} className="ui-btn ui-btn-primary">
            <Plus className="h-4 w-4" />
            Ajouter un livrable
          </button>
        }
      />

      <section className="ui-surface flex flex-wrap items-end gap-3 rounded-2xl p-4">
        <label className="space-y-1">
          <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/45">
            <Filter className="h-3 w-3" /> Entité
          </span>
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <option value="all">Toutes</option>
            {companyNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/45">
            <CalendarDays className="h-3 w-3" /> Mois
          </span>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm capitalize"
          >
            <option value="all">Tous</option>
            {months.map((m) => (
              <option key={m} value={m} className="capitalize">
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/45">
            Tri
          </span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <option value="newest">Plus récents</option>
            <option value="oldest">Plus anciens</option>
            <option value="name">Nom du projet</option>
          </select>
        </label>
        <p className="ml-auto text-sm text-[color:var(--foreground)]/50">
          {filtered.length} rendu{filtered.length !== 1 ? "s" : ""}
        </p>
      </section>

      {loading ? (
        <div className="flex justify-center py-20">
          <TuesdayLoader size={28} label="Chargement des livrables…" showLabel />
        </div>
      ) : filtered.length === 0 ? (
        <div className="ui-surface rounded-3xl px-6 py-16 text-center">
          <PackageCheck className="mx-auto h-10 w-10 text-[color:var(--foreground)]/30" />
          <p className="mt-3 text-lg font-semibold text-[var(--foreground)]">Aucun livrable pour l’instant</p>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
            Passez une tâche en Terminé ou ajoutez un rendu manuellement.
          </p>
          <button type="button" onClick={() => setManualOpen(true)} className="ui-btn ui-btn-primary mt-5">
            <Plus className="h-4 w-4" />
            Ajouter un livrable
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([key, list]) => (
            <section key={key} className="space-y-3">
              <h2 className="px-1 text-sm font-bold uppercase tracking-[0.14em] text-[color:var(--foreground)]/45 capitalize">
                {monthLabel(key)}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((item) => {
                  const pdf = isPdfDeliverable(item);
                  return (
                    <article
                      key={item.id}
                      className="group overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-1)]"
                    >
                      <div className="relative aspect-[4/3] bg-[var(--surface-soft)]">
                        {item.fileUrl ? (
                          pdf ? (
                            <iframe
                              title={item.projectName}
                              src={pdfEmbedSrc(item.fileUrl)}
                              className="h-full w-full"
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.fileUrl}
                              alt={item.projectName}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          )
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-2 text-[color:var(--foreground)]/40">
                            <FileText className="h-8 w-8" />
                            <span className="text-xs">Sans aperçu</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-semibold text-[var(--foreground)]">
                              {item.projectName}
                            </h3>
                            <p className="mt-0.5 text-xs text-[color:var(--foreground)]/50">
                              {item.company || "Sans entité"} ·{" "}
                              {format(parseISO(item.completedAt), "d MMM yyyy", { locale: fr })}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-0.5">
                            <button
                              type="button"
                              onClick={() => setEditing(item)}
                              className="ui-btn ui-btn-ghost h-8 w-8 p-0 opacity-70 hover:opacity-100"
                              aria-label="Modifier"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void onDelete(item)}
                              className="ui-btn ui-btn-ghost h-8 w-8 p-0 opacity-70 hover:opacity-100"
                              aria-label="Supprimer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        {item.serverPath ? (
                          <div className="flex items-center gap-1.5 rounded-xl bg-[var(--surface-soft)] px-2.5 py-2">
                            <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-[color:var(--foreground)]/70">
                              {item.serverPath}
                            </code>
                            <button
                              type="button"
                              onClick={() => void copyPath(item.serverPath)}
                              className="ui-btn ui-btn-ghost h-7 w-7 shrink-0 p-0"
                              aria-label="Copier le chemin"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                          {item.fileUrl ? (
                            <a
                              href={item.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="ui-btn ui-btn-ghost text-xs"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Ouvrir
                            </a>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setEditing(item)}
                            className="ui-btn ui-btn-ghost text-xs"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Modifier
                          </button>
                          {item.taskId ? (
                            <a
                              href={`/v3/dashboard/kanban?task=${item.taskId}`}
                              className="ui-btn ui-btn-ghost text-xs"
                            >
                              Voir la tâche
                            </a>
                          ) : null}
                          {item.notes ? (
                            <span className="line-clamp-2 w-full text-[11px] text-[color:var(--foreground)]/55">
                              {item.notes}
                            </span>
                          ) : null}
                          {item.fileName ? (
                            <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-[11px] text-[color:var(--foreground)]/55">
                              {item.fileName}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <DeliverableFormModal
        open={manualOpen}
        mode="manual"
        companies={companies}
        createdBy={user?.id}
        onSave={saveCreate}
        onClose={() => setManualOpen(false)}
      />

      <DeliverableFormModal
        open={Boolean(editing)}
        mode="edit"
        deliverable={editing}
        companies={companies}
        createdBy={user?.id}
        onSave={saveEdit}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}
