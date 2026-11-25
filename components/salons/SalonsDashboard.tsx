"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  Copy,
  ExternalLink,
  LayoutGrid,
  Pencil,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { TuesdayLoader } from "@/components/brand";
import CreateSalonModal from "./CreateSalonModal";
import SalonLogo from "./SalonLogo";
import { useSalons } from "../../lib/useSalons";
import {
  SALON_MODE_LABELS,
  SALON_STATUS_LABELS,
  type Salon,
} from "../../lib/salonTypes";
import {
  removeSalonLogoFile,
  salonLogoPathFromUrl,
  uploadSalonLogoFile,
} from "../../lib/salonLogoUpload";
import { copyText } from "../../lib/copyText";
import { toastError } from "../../lib/toast";
import { useConfirm } from "../ui/ConfirmDialog";
import { ContextMenu, useContextMenu, type ContextMenuItem } from "../ui/ContextMenu";

function formatMoney(n: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatShortDate(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y?.slice(2) ?? ""}`;
}

const tile =
  "rounded-[1.5rem] sm:rounded-[1.75rem] border border-[var(--line)] bg-[var(--surface)] shadow-[0_1px_0_rgba(20,17,13,0.04)]";

export default function SalonsDashboard() {
  const {
    salons,
    budgetLines,
    loading,
    addSalon,
    patchSalon,
    removeSalon,
    duplicateSalon,
    workspaceId,
    supabase,
  } = useSalons();
  const confirm = useConfirm();
  const router = useRouter();
  const [year, setYear] = useState(2027);
  const [createOpen, setCreateOpen] = useState(false);
  const [logoUploadingId, setLogoUploadingId] = useState<string | null>(null);

  const changeSalonLogo = useCallback(
    async (salon: Salon, file: File) => {
      if (!workspaceId) {
        toastError("Aucun espace actif.");
        return;
      }
      setLogoUploadingId(salon.id);
      try {
        const uploaded = await uploadSalonLogoFile(supabase, workspaceId, salon.id, file);
        if ("error" in uploaded) {
          toastError(uploaded.error);
          return;
        }
        const previousPath = salonLogoPathFromUrl(salon.logoUrl);
        const updated = await patchSalon(salon.id, { logoUrl: uploaded.publicUrl });
        if (!updated) return;
        if (previousPath && previousPath !== uploaded.storagePath) {
          void removeSalonLogoFile(supabase, previousPath);
        }
      } finally {
        setLogoUploadingId(null);
      }
    },
    [patchSalon, supabase, workspaceId],
  );

  const resetSalonLogo = useCallback(
    async (salon: Salon) => {
      const previousPath = salonLogoPathFromUrl(salon.logoUrl);
      const updated = await patchSalon(salon.id, { logoUrl: null });
      if (!updated) return;
      if (previousPath) void removeSalonLogoFile(supabase, previousPath);
    },
    [patchSalon, supabase],
  );

  const renameSalon = useCallback(
    async (salon: Salon) => {
      const next = window.prompt("Nouveau nom du salon", salon.name);
      if (next == null) return;
      const trimmed = next.trim();
      if (!trimmed || trimmed === salon.name) return;
      await patchSalon(salon.id, { name: trimmed });
    },
    [patchSalon],
  );

  const cloneSalonCard = useCallback(
    async (salon: Salon) => {
      const name = window.prompt("Nom de la nouvelle édition", `${salon.name} (copie)`);
      if (!name) return;
      const start = window.prompt("Date début (YYYY-MM-DD)", salon.startDate);
      if (!start) return;
      const end = window.prompt("Date fin (YYYY-MM-DD)", salon.endDate);
      if (!end) return;
      const created = await duplicateSalon(salon, {
        name,
        startDate: start,
        endDate: end,
      });
      if (created) router.push(`/v3/salons/${created.id}`);
    },
    [duplicateSalon, router],
  );

  const destroySalon = useCallback(
    async (salon: Salon) => {
      const ok = await confirm({
        title: "Supprimer ce salon ?",
        description: (
          <>
            « {salon.name} » et sa checklist / docs / budget seront supprimés.
          </>
        ),
        confirmLabel: "Supprimer",
        variant: "destructive",
      });
      if (!ok) return;
      await removeSalon(salon.id);
    },
    [confirm, removeSalon],
  );

  const yearSalons = useMemo(
    () =>
      salons
        .filter(
          (s) =>
            s.startDate.startsWith(String(year)) || s.endDate.startsWith(String(year)),
        )
        .slice()
        .sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [salons, year],
  );

  const featuredSalon = yearSalons[0] ?? null;

  const budgetBySalon = useMemo(() => {
    const map = new Map<string, { engaged: number; paid: number }>();
    for (const line of budgetLines) {
      const cur = map.get(line.salonId) ?? { engaged: 0, paid: 0 };
      cur.engaged += line.amountTtc || line.amountHt;
      if (line.paid) cur.paid += line.amountTtc || line.amountHt;
      map.set(line.salonId, cur);
    }
    return map;
  }, [budgetLines]);

  const yearBudget = useMemo(() => {
    let engaged = 0;
    let paid = 0;
    for (const s of yearSalons) {
      const b = budgetBySalon.get(s.id);
      if (!b) continue;
      engaged += b.engaged;
      paid += b.paid;
    }
    return { engaged, paid, reste: Math.max(0, engaged - paid) };
  }, [budgetBySalon, yearSalons]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <TuesdayLoader />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 sm:space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/45">
            Communication
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Salons
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[color:var(--foreground)]/55">
            Prochain rendez-vous, budget, et tous les salons de l’année — avec logos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="ui-input w-auto min-w-[5.5rem] text-xs"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="Année"
          >
            {[2027, 2028, 2029, 2030].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <Link href="/v3/dashboard/calendar" className="ui-btn text-xs">
            <CalendarRange className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Agenda</span>
          </Link>
          <Link href="/v3/dashboard/kanban" className="ui-btn text-xs">
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Tableau</span>
          </Link>
          <button
            type="button"
            className="ui-btn ui-btn-primary text-xs"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Nouveau
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-12 lg:gap-4">
        {/* Prochain salon */}
        {featuredSalon ? (
          <FeaturedSalonCard
            salon={featuredSalon}
            logoUploading={logoUploadingId === featuredSalon.id}
            onChangeLogo={(file) => changeSalonLogo(featuredSalon, file)}
            onResetLogo={() => resetSalonLogo(featuredSalon)}
            onRename={() => void renameSalon(featuredSalon)}
            onClone={() => void cloneSalonCard(featuredSalon)}
            onMarkDone={() => void patchSalon(featuredSalon.id, { status: "termine" })}
            onDelete={() => void destroySalon(featuredSalon)}
          />
        ) : (
          <section
            className={`${tile} relative overflow-hidden p-5 sm:p-6 md:col-span-1 lg:col-span-8`}
            style={{
              background:
                "linear-gradient(145deg, color-mix(in srgb, var(--accent) 10%, var(--surface)) 0%, var(--surface) 55%, var(--surface-soft) 100%)",
            }}
          >
            <span className="inline-flex rounded-full bg-[var(--surface)]/90 px-3 py-1 text-[11px] font-semibold tracking-wide ring-1 ring-[var(--line)]">
              Prochain salon
            </span>
            <h2 className="mt-4 text-xl font-semibold tracking-tight sm:text-2xl">
              Aucun salon en {year}
            </h2>
            <p className="mt-2 max-w-md text-sm text-[color:var(--foreground)]/60">
              Choisis SPACE, EuroTier, VIV… dans le catalogue pour démarrer.
            </p>
            <button
              type="button"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--foreground)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-contrast)]"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Ajouter un salon
            </button>
          </section>
        )}

        {/* Budget */}
        <section className={`${tile} flex flex-col justify-between p-5 sm:p-6 md:col-span-1 lg:col-span-4`}>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/45">
              <Wallet className="h-3.5 w-3.5" aria-hidden />
              Budget {year}
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              {formatMoney(yearBudget.engaged)}
            </p>
            <p className="mt-1 text-sm text-[color:var(--foreground)]/50">engagé</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[color:var(--foreground)]/60">
            <span>Payé {formatMoney(yearBudget.paid)}</span>
            <span>Reste {formatMoney(yearBudget.reste)}</span>
            <span>
              {yearSalons.length} salon{yearSalons.length > 1 ? "s" : ""}
            </span>
          </div>
        </section>

        {/* Portfolio */}
        <div className="md:col-span-2 lg:col-span-12">
          <div className="mb-3 flex items-end justify-between gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/45">
              Tous les salons {year}
            </h3>
            <span className="text-[11px] text-[color:var(--foreground)]/40">
              {yearSalons.length} salon{yearSalons.length > 1 ? "s" : ""}
            </span>
          </div>
          {yearSalons.length === 0 ? (
            <section className={`${tile} border-dashed p-8 text-center`}>
              <p className="text-sm text-[color:var(--foreground)]/55">
                Aucun salon cette année.
              </p>
              <button
                type="button"
                className="ui-btn ui-btn-primary mt-4 text-xs"
                onClick={() => setCreateOpen(true)}
              >
                Ouvrir le catalogue
              </button>
            </section>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {yearSalons.map((s) => (
                <li key={s.id}>
                  <SalonCard
                    salon={s}
                    engaged={budgetBySalon.get(s.id)?.engaged ?? 0}
                    logoUploading={logoUploadingId === s.id}
                    onChangeLogo={(file) => changeSalonLogo(s, file)}
                    onResetLogo={() => resetSalonLogo(s)}
                    onRename={() => void renameSalon(s)}
                    onClone={() => void cloneSalonCard(s)}
                    onMarkDone={() => void patchSalon(s.id, { status: "termine" })}
                    onDelete={() => void destroySalon(s)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <CreateSalonModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (input) => {
          const created = await addSalon(input);
          if (created) window.location.href = `/v3/salons/${created.id}`;
        }}
      />
    </div>
  );
}

function salonCardMenuItems(opts: {
  salon: Salon;
  onOpen: () => void;
  onRename: () => void;
  onClone: () => void;
  onMarkDone: () => void;
  onDelete: () => void;
}): ContextMenuItem[] {
  const items: ContextMenuItem[] = [
    {
      id: "open",
      label: "Ouvrir",
      icon: <ExternalLink className="h-3.5 w-3.5" />,
      onSelect: opts.onOpen,
    },
    {
      id: "rename",
      label: "Renommer…",
      icon: <Pencil className="h-3.5 w-3.5" />,
      onSelect: opts.onRename,
    },
    {
      id: "copy",
      label: "Copier le nom",
      icon: <Copy className="h-3.5 w-3.5" />,
      onSelect: () => {
        void copyText(opts.salon.name, "Nom copié");
      },
    },
    {
      id: "clone",
      label: "Cloner…",
      icon: <Copy className="h-3.5 w-3.5" />,
      onSelect: opts.onClone,
    },
  ];
  if (opts.salon.status !== "termine") {
    items.push({
      id: "done",
      label: "Marquer terminé",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      onSelect: opts.onMarkDone,
    });
  }
  items.push(
    { id: "sep-danger", type: "separator" },
    {
      id: "delete",
      label: "Supprimer",
      icon: <Trash2 className="h-3.5 w-3.5" />,
      danger: true,
      onSelect: opts.onDelete,
    },
  );
  return items;
}

function FeaturedSalonCard({
  salon,
  logoUploading,
  onChangeLogo,
  onResetLogo,
  onRename,
  onClone,
  onMarkDone,
  onDelete,
}: {
  salon: Salon;
  logoUploading: boolean;
  onChangeLogo: (file: File) => void;
  onResetLogo: () => void;
  onRename: () => void;
  onClone: () => void;
  onMarkDone: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const { position, close, triggerProps, consumeClickSuppression } = useContextMenu();
  const href = `/v3/salons/${salon.id}`;

  return (
    <>
      <article
        {...triggerProps}
        onClick={(e) => {
          if (consumeClickSuppression()) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        className={`${tile} group relative overflow-hidden p-5 sm:p-6 md:col-span-1 lg:col-span-8 lg:min-h-[220px]`}
        style={{
          background:
            "linear-gradient(145deg, color-mix(in srgb, var(--accent) 10%, var(--surface)) 0%, var(--surface) 55%, var(--surface-soft) 100%)",
        }}
      >
        {/* Lien plein cadre : le logo reste hors du <Link> pour l’upload. */}
        <Link
          href={href}
          className="absolute inset-0 z-0"
          aria-label={`Ouvrir ${salon.name}`}
          onClick={(e) => {
            if (consumeClickSuppression()) {
              e.preventDefault();
            }
          }}
        />
        <div className="relative z-10 pointer-events-none">
          <span className="inline-flex rounded-full bg-[var(--surface)]/90 px-3 py-1 text-[11px] font-semibold tracking-wide text-[color:var(--foreground)]/70 ring-1 ring-[var(--line)]">
            Prochain salon
          </span>
          <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-start gap-3 sm:gap-4">
              <span className="pointer-events-auto">
                <SalonLogo
                  slug={salon.catalogSlug}
                  name={salon.name}
                  logoUrl={salon.logoUrl}
                  size={72}
                  editable
                  uploading={logoUploading}
                  onChangeLogo={onChangeLogo}
                  onResetLogo={onResetLogo}
                />
              </span>
              <div className="min-w-0">
                <h2 className="text-xl font-semibold leading-snug tracking-tight group-hover:underline sm:text-2xl lg:text-[1.75rem]">
                  {salon.name}
                </h2>
                <p className="mt-2 text-sm text-[color:var(--foreground)]/60">
                  {formatShortDate(salon.startDate)} → {formatShortDate(salon.endDate)}
                  {salon.location ? ` · ${salon.location}` : ""}
                </p>
                <p className="mt-2 text-xs text-[color:var(--foreground)]/50">
                  {SALON_MODE_LABELS[salon.mode]}
                  {(salon.hall || salon.standNumber) &&
                    ` · ${[salon.hall, salon.standNumber].filter(Boolean).join(" / ")}`}
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--foreground)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-contrast)]">
              Ouvrir
              <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          </div>
        </div>
      </article>
      <ContextMenu
        position={position}
        items={salonCardMenuItems({
          salon,
          onOpen: () => router.push(href),
          onRename,
          onClone,
          onMarkDone,
          onDelete,
        })}
        onClose={close}
        ariaLabel={`Actions salon ${salon.name}`}
      />
    </>
  );
}

function SalonCard({
  salon,
  engaged,
  logoUploading,
  onChangeLogo,
  onResetLogo,
  onRename,
  onClone,
  onMarkDone,
  onDelete,
}: {
  salon: Salon;
  engaged: number;
  logoUploading: boolean;
  onChangeLogo: (file: File) => void;
  onResetLogo: () => void;
  onRename: () => void;
  onClone: () => void;
  onMarkDone: () => void;
  onDelete: () => void;
}) {
  const router = useRouter();
  const { position, close, triggerProps, consumeClickSuppression } = useContextMenu();
  const href = `/v3/salons/${salon.id}`;

  return (
    <>
      <article
        {...triggerProps}
        onClick={(e) => {
          if (consumeClickSuppression()) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        className={`${tile} group relative flex h-full flex-col p-4 transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--line))]`}
      >
        <Link
          href={href}
          className="absolute inset-0 z-0"
          aria-label={`Ouvrir ${salon.name}`}
          onClick={(e) => {
            if (consumeClickSuppression()) {
              e.preventDefault();
            }
          }}
        />
        <div className="relative z-10 pointer-events-none flex h-full flex-col">
          <div className="flex items-start gap-3">
            <span className="pointer-events-auto">
              <SalonLogo
                slug={salon.catalogSlug}
                name={salon.name}
                logoUrl={salon.logoUrl}
                size={52}
                editable
                uploading={logoUploading}
                onChangeLogo={onChangeLogo}
                onResetLogo={onResetLogo}
              />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold tracking-tight group-hover:underline">
                {salon.name}
              </h3>
              <p className="mt-1 text-xs text-[color:var(--foreground)]/50">
                {formatShortDate(salon.startDate)} → {formatShortDate(salon.endDate)}
              </p>
              {salon.location ? (
                <p className="mt-0.5 truncate text-xs text-[color:var(--foreground)]/45">
                  {salon.location}
                </p>
              ) : null}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 font-semibold">
              {SALON_MODE_LABELS[salon.mode]}
            </span>
            <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[color:var(--foreground)]/60">
              {SALON_STATUS_LABELS[salon.status]}
            </span>
            {engaged > 0 && (
              <span className="ml-auto text-[color:var(--foreground)]/50">{formatMoney(engaged)}</span>
            )}
          </div>
        </div>
      </article>
      <ContextMenu
        position={position}
        items={salonCardMenuItems({
          salon,
          onOpen: () => router.push(href),
          onRename,
          onClone,
          onMarkDone,
          onDelete,
        })}
        onClose={close}
        ariaLabel={`Actions salon ${salon.name}`}
      />
    </>
  );
}
