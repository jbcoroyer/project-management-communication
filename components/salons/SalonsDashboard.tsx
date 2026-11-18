"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  LayoutGrid,
  Plus,
  Sprout,
  Wallet,
} from "lucide-react";
import { TuesdayLoader } from "@/components/brand";
import CreateSalonModal from "./CreateSalonModal";
import SalonLogo from "./SalonLogo";
import { useSalons } from "../../lib/useSalons";
import { checklistProgress, datesOverlap } from "../../lib/salonData";
import {
  SALON_MODE_LABELS,
  SALON_STATUS_LABELS,
  type Salon,
  type SalonChecklistItem,
} from "../../lib/salonTypes";

type AlertItem = {
  id: string;
  text: string;
  href?: string;
};

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

function daysUntil(iso: string | null | undefined) {
  if (!iso) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const d = new Date(`${iso}T12:00:00`);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

const tile =
  "rounded-[1.5rem] sm:rounded-[1.75rem] border border-[var(--line)] bg-[var(--surface)] shadow-[0_1px_0_rgba(20,17,13,0.04)]";

export default function SalonsDashboard() {
  const { salons, checklist, budgetLines, loading, addSalon, seedYear } = useSalons();
  const [year, setYear] = useState(2026);
  const [createOpen, setCreateOpen] = useState(false);

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

  const checklistBySalon = useMemo(() => {
    const map = new Map<string, SalonChecklistItem[]>();
    for (const item of checklist) {
      const list = map.get(item.salonId) ?? [];
      list.push(item);
      map.set(item.salonId, list);
    }
    return map;
  }, [checklist]);

  const upcomingTodos = useMemo(() => {
    const salonById = new Map(salons.map((s) => [s.id, s]));
    return checklist
      .filter((c) => !c.done && c.dueDate)
      .map((c) => ({ ...c, salon: salonById.get(c.salonId) ?? null }))
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
      .slice(0, 6);
  }, [checklist, salons]);

  const nextAction = upcomingTodos[0] ?? null;
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

  const alerts = useMemo(() => {
    const out: AlertItem[] = [];
    const seen = new Set<string>();
    const today = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < yearSalons.length; i++) {
      for (let j = i + 1; j < yearSalons.length; j++) {
        const a = yearSalons[i];
        const b = yearSalons[j];
        if (!datesOverlap(a.startDate, a.endDate, b.startDate, b.endDate)) continue;
        const id = `overlap:${a.id}:${b.id}`;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({
          id,
          text: `Dates qui se chevauchent : ${a.name} ↔ ${b.name}`,
        });
      }
    }

    const overdue = checklist
      .filter((c) => !c.done && c.dueDate && c.dueDate < today)
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

    for (const c of overdue) {
      const id = `overdue:${c.id}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const salon = salons.find((s) => s.id === c.salonId);
      out.push({
        id,
        text: `En retard — ${c.label}${salon ? ` · ${salon.name}` : ""}`,
        href: `/v3/salons/${c.salonId}#checklist`,
      });
      if (out.length >= 6) break;
    }

    return out.slice(0, 6);
  }, [checklist, salons, yearSalons]);

  const openCount = yearSalons.filter((s) => s.status !== "termine").length;
  const doneChecklist = checklist.filter((c) => c.done).length;
  const totalChecklist = checklist.length;

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
            Prochaine action, portefeuille, budget — les échéances vivent aussi sur le tableau et
            l’agenda.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="ui-input text-xs"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="Année"
          >
            {[2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button type="button" className="ui-btn text-xs" onClick={() => void seedYear()}>
            <Sprout className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Seed 2026</span>
            <span className="sm:hidden">Seed</span>
          </button>
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

      {/*
        Bento 12-col on lg, 2-col on md, 1-col mobile.
        Aligned spans: hero 8+4 / featured 7+5 / portfolio full width grid.
      */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-12 lg:gap-4">
        {/* Hero next action */}
        <section
          className={`${tile} relative overflow-hidden p-5 sm:p-6 md:col-span-2 lg:col-span-8 lg:min-h-[220px]`}
          style={{
            background:
              "linear-gradient(145deg, color-mix(in srgb, var(--accent) 10%, var(--surface)) 0%, var(--surface) 55%, var(--surface-soft) 100%)",
          }}
        >
          <span className="inline-flex rounded-full bg-[var(--surface)]/90 px-3 py-1 text-[11px] font-semibold tracking-wide text-[color:var(--foreground)]/70 ring-1 ring-[var(--line)]">
            À faire maintenant
          </span>
          {nextAction ? (
            <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--foreground)]/45">
                  Échéance {formatShortDate(nextAction.dueDate ?? "")}
                  {daysUntil(nextAction.dueDate) != null && (
                    <>
                      {" "}
                      · J{daysUntil(nextAction.dueDate)! >= 0 ? "−" : "+"}
                      {Math.abs(daysUntil(nextAction.dueDate)!)}
                    </>
                  )}
                </p>
                <h2 className="mt-2 text-xl font-semibold leading-snug tracking-tight sm:text-2xl lg:text-[1.75rem]">
                  {nextAction.label}
                </h2>
                {nextAction.salon && (
                  <div className="mt-3 flex items-center gap-2.5">
                    <SalonLogo
                      slug={nextAction.salon.catalogSlug}
                      name={nextAction.salon.name}
                      size={36}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{nextAction.salon.name}</p>
                      <p className="text-[11px] text-[color:var(--foreground)]/50">
                        {SALON_MODE_LABELS[nextAction.salon.mode]}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <Link
                href={`/v3/salons/${nextAction.salonId}#checklist`}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--foreground)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-contrast)] transition hover:opacity-90"
              >
                Ouvrir
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          ) : (
            <div className="mt-5">
              <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Rien d’urgent</h2>
              <p className="mt-2 max-w-md text-sm text-[color:var(--foreground)]/60">
                {yearSalons.length === 0
                  ? "Crée un salon depuis le catalogue, ou lance le Seed 2026."
                  : "Les prochaines cases sont à jour."}
              </p>
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--foreground)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-contrast)]"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Ajouter un salon
              </button>
            </div>
          )}
        </section>

        {/* Year + budget stack */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:col-span-2 lg:col-span-4 lg:grid-cols-1 lg:gap-4">
          <section className={`${tile} bg-[var(--foreground)] p-5 text-[var(--accent-contrast)]`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-60">
              Année {year}
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-tight">{openCount}</p>
            <p className="mt-1 text-sm opacity-75">
              salon{openCount > 1 ? "s" : ""} actifs
            </p>
            <p className="mt-4 text-xs opacity-55">
              Checklist {doneChecklist}/{totalChecklist || "—"}
            </p>
          </section>
          <section className={`${tile} p-5`}>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/45">
              <Wallet className="h-3.5 w-3.5" aria-hidden />
              Budget {year}
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">
              {formatMoney(yearBudget.engaged)}
            </p>
            <p className="text-xs text-[color:var(--foreground)]/50">engagé</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[color:var(--foreground)]/60">
              <span>Payé {formatMoney(yearBudget.paid)}</span>
              <span>Reste {formatMoney(yearBudget.reste)}</span>
            </div>
          </section>
        </div>

        {/* Featured next salon */}
        {featuredSalon ? (
          <Link
            href={`/v3/salons/${featuredSalon.id}`}
            className={`${tile} group p-5 transition hover:-translate-y-0.5 md:col-span-1 lg:col-span-7`}
          >
            <span className="inline-flex rounded-full bg-[var(--surface-soft)] px-3 py-1 text-[11px] font-semibold">
              Prochain salon
            </span>
            <div className="mt-4 flex items-start gap-3 sm:gap-4">
              <SalonLogo
                slug={featuredSalon.catalogSlug}
                name={featuredSalon.name}
                size={64}
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold tracking-tight group-hover:underline sm:text-xl">
                  {featuredSalon.name}
                </h3>
                <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
                  {formatShortDate(featuredSalon.startDate)} →{" "}
                  {formatShortDate(featuredSalon.endDate)}
                  {featuredSalon.location ? ` · ${featuredSalon.location}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[color:var(--foreground)]/55">
                  <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 font-semibold">
                    {SALON_MODE_LABELS[featuredSalon.mode]}
                  </span>
                  <span>
                    {checklistProgress(checklistBySalon.get(featuredSalon.id) ?? [])}% checklist
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ) : (
          <section className={`${tile} border-dashed p-5 md:col-span-1 lg:col-span-7`}>
            <h3 className="text-base font-semibold">Aucun salon en {year}</h3>
            <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
              Choisis SPACE, EuroTier, VIV… dans le catalogue.
            </p>
          </section>
        )}

        {/* Alerts */}
        <section
          className={`${tile} p-5 md:col-span-1 lg:col-span-5 ${
            alerts.length
              ? "border-amber-500/25 bg-[color-mix(in_srgb,#d97706_8%,var(--surface))]"
              : ""
          }`}
        >
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            Points d’attention
          </div>
          {alerts.length === 0 ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-[color:var(--foreground)]/55">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
              Rien de bloquant.
            </div>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {alerts.map((a) => (
                <li key={a.id} className="text-sm leading-snug">
                  {a.href ? (
                    <Link href={a.href} className="hover:underline">
                      {a.text}
                    </Link>
                  ) : (
                    a.text
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Upcoming checklist (secondary) */}
        <section className={`${tile} p-5 md:col-span-2 lg:col-span-12`}>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/45">
              Suite de la checklist
            </h3>
            <span className="text-[11px] text-[color:var(--foreground)]/40">
              {Math.max(0, upcomingTodos.length - 1)} à venir
            </span>
          </div>
          {upcomingTodos.length <= 1 ? (
            <p className="mt-3 text-sm text-[color:var(--foreground)]/50">Liste à jour.</p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingTodos.slice(1).map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/v3/salons/${t.salonId}#checklist`}
                    className="flex items-start gap-2.5 rounded-2xl bg-[var(--surface-soft)] px-3 py-2.5 transition hover:bg-[color-mix(in_srgb,var(--accent)_8%,var(--surface-soft))]"
                  >
                    <SalonLogo
                      slug={t.salon?.catalogSlug}
                      name={t.salon?.name ?? t.label}
                      size={32}
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] text-[color:var(--foreground)]/45">
                        {formatShortDate(t.dueDate ?? "")}
                        {t.salon ? ` · ${t.salon.name}` : ""}
                      </p>
                      <p className="text-sm leading-snug">{t.label}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Portfolio */}
        <div className="md:col-span-2 lg:col-span-12">
          <div className="mb-3 flex items-end justify-between gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/45">
              Portefeuille {year}
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
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  className="ui-btn ui-btn-primary text-xs"
                  onClick={() => setCreateOpen(true)}
                >
                  Catalogue
                </button>
                <button type="button" className="ui-btn text-xs" onClick={() => void seedYear()}>
                  Seed 2026
                </button>
              </div>
            </section>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {yearSalons.map((s) => (
                <li key={s.id}>
                  <SalonCard
                    salon={s}
                    progress={checklistProgress(checklistBySalon.get(s.id) ?? [])}
                    engaged={budgetBySalon.get(s.id)?.engaged ?? 0}
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

function SalonCard({
  salon,
  progress,
  engaged,
}: {
  salon: Salon;
  progress: number;
  engaged: number;
}) {
  return (
    <Link
      href={`/v3/salons/${salon.id}`}
      className={`${tile} group flex h-full flex-col p-4 transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--line))]`}
    >
      <div className="flex items-start gap-3">
        <SalonLogo slug={salon.catalogSlug} name={salon.name} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold tracking-tight group-hover:underline">
              {salon.name}
            </h3>
          </div>
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
      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 font-semibold">
          {SALON_MODE_LABELS[salon.mode]}
        </span>
        <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[color:var(--foreground)]/60">
          {SALON_STATUS_LABELS[salon.status]}
        </span>
        {(salon.hall || salon.standNumber) && (
          <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[color:var(--foreground)]/60">
            {[salon.hall, salon.standNumber].filter(Boolean).join(" / ")}
            {salon.surfaceM2 != null ? ` · ${salon.surfaceM2} m²` : ""}
          </span>
        )}
      </div>
      <div className="mt-auto pt-3">
        <div className="mb-1 flex justify-between text-[11px] text-[color:var(--foreground)]/50">
          <span>Checklist {progress}%</span>
          {engaged > 0 && <span>{formatMoney(engaged)}</span>}
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-soft)]">
          <div
            className="h-full rounded-full bg-[var(--accent)]"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      </div>
    </Link>
  );
}
