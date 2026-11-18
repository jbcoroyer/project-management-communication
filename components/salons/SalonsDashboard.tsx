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

/** Pastel tiles — light Tuesday, not dark mockup. */
const TILE = {
  sage: "bg-[color-mix(in_srgb,var(--accent)_12%,#e8f0e4)] text-[var(--foreground)]",
  sand: "bg-[color-mix(in_srgb,var(--accent)_8%,#f3ebe0)] text-[var(--foreground)]",
  mist: "bg-[var(--surface-soft)] text-[var(--foreground)]",
  alert: "bg-[color-mix(in_srgb,#d97706_14%,var(--surface))] text-[var(--foreground)]",
  ink: "bg-[var(--foreground)] text-[var(--accent-contrast)]",
  surface: "bg-[var(--surface)] text-[var(--foreground)] border border-[var(--line)]",
} as const;

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
    const nameById = new Map(salons.map((s) => [s.id, s]));
    return checklist
      .filter((c) => !c.done && c.dueDate)
      .map((c) => ({
        ...c,
        salon: nameById.get(c.salonId) ?? null,
      }))
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
    const out: { text: string; href?: string }[] = [];
    const today = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < yearSalons.length; i++) {
      for (let j = i + 1; j < yearSalons.length; j++) {
        const a = yearSalons[i];
        const b = yearSalons[j];
        if (datesOverlap(a.startDate, a.endDate, b.startDate, b.endDate)) {
          out.push({ text: `Dates qui se chevauchent : ${a.name} et ${b.name}` });
        }
      }
    }
    for (const c of checklist) {
      if (!c.done && c.dueDate && c.dueDate < today) {
        const salon = salons.find((s) => s.id === c.salonId);
        out.push({
          text: `En retard — ${c.label}`,
          href: `/v3/salons/${c.salonId}#checklist`,
        });
        if (salon && out.length >= 5) break;
      }
    }
    return out.slice(0, 5);
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
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/45">
            Communication
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            Salons
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[color:var(--foreground)]/55">
            Une vue claire : ce qu’il faut faire maintenant, les prochains salons, le budget.
            Les échéances vivent aussi sur le tableau et l’agenda.
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
          <button
            type="button"
            className="ui-btn text-xs"
            onClick={() => void seedYear()}
            title="Ajouter les salons 2026 documentés"
          >
            <Sprout className="h-3.5 w-3.5" aria-hidden />
            Seed 2026
          </button>
          <Link href="/v3/dashboard/calendar" className="ui-btn text-xs">
            <CalendarRange className="h-3.5 w-3.5" aria-hidden />
            Agenda
          </Link>
          <Link href="/v3/dashboard/kanban" className="ui-btn text-xs">
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
            Tableau
          </Link>
          <button
            type="button"
            className="ui-btn ui-btn-primary text-xs"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Nouveau salon
          </button>
        </div>
      </header>

      {/* Bento grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-6 md:auto-rows-[minmax(7.5rem,auto)]">
        {/* Next action — large */}
        <section
          className={`md:col-span-4 md:row-span-2 rounded-[1.75rem] p-5 ${TILE.sage}`}
        >
          <span className="inline-flex rounded-full bg-[var(--surface)]/80 px-3 py-1 text-[11px] font-semibold tracking-wide">
            À faire maintenant
          </span>
          {nextAction ? (
            <div className="mt-4 flex h-[calc(100%-2rem)] flex-col justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--foreground)]/50">
                  Échéance {formatShortDate(nextAction.dueDate ?? "")}
                  {daysUntil(nextAction.dueDate) != null && (
                    <> · J{daysUntil(nextAction.dueDate)! >= 0 ? "−" : "+"}
                    {Math.abs(daysUntil(nextAction.dueDate)!)}</>
                  )}
                </p>
                <h2 className="mt-2 max-w-xl text-2xl font-semibold leading-snug tracking-tight md:text-3xl">
                  {nextAction.label}
                </h2>
                {nextAction.salon && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-[color:var(--foreground)]/65">
                    <SalonLogo
                      slug={nextAction.salon.catalogSlug}
                      name={nextAction.salon.name}
                      size={28}
                    />
                    <span>{nextAction.salon.name}</span>
                  </div>
                )}
              </div>
              <Link
                href={`/v3/salons/${nextAction.salonId}#checklist`}
                className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] transition hover:opacity-90"
              >
                Ouvrir la checklist
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          ) : (
            <div className="mt-6">
              <h2 className="text-2xl font-semibold tracking-tight">Rien d’urgent</h2>
              <p className="mt-2 max-w-md text-sm text-[color:var(--foreground)]/60">
                {yearSalons.length === 0
                  ? "Crée un salon depuis le catalogue, ou lance le Seed 2026."
                  : "Toutes les prochaines cases sont à jour. Tu peux préparer le salon suivant."}
              </p>
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)]"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4" aria-hidden />
                Ajouter un salon
              </button>
            </div>
          )}
        </section>

        {/* Year pulse */}
        <section className={`md:col-span-2 rounded-[1.75rem] p-5 ${TILE.ink}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-60">
            Année {year}
          </p>
          <p className="mt-3 text-4xl font-semibold tracking-tight">{openCount}</p>
          <p className="mt-1 text-sm opacity-75">
            salon{openCount > 1 ? "s" : ""} en préparation / en cours
          </p>
          <p className="mt-4 text-xs opacity-60">
            Checklist {doneChecklist}/{totalChecklist || "—"} faites
          </p>
        </section>

        {/* Budget */}
        <section className={`md:col-span-2 rounded-[1.75rem] p-5 ${TILE.sand}`}>
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/50">
            <Wallet className="h-3.5 w-3.5" aria-hidden />
            Budget {year}
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-tight">
            {formatMoney(yearBudget.engaged)}
          </p>
          <p className="text-xs text-[color:var(--foreground)]/55">engagé</p>
          <div className="mt-3 flex gap-4 text-xs">
            <span>Payé {formatMoney(yearBudget.paid)}</span>
            <span>Reste {formatMoney(yearBudget.reste)}</span>
          </div>
        </section>

        {/* Featured next salon */}
        {featuredSalon && (
          <Link
            href={`/v3/salons/${featuredSalon.id}`}
            className={`md:col-span-3 rounded-[1.75rem] p-5 transition hover:-translate-y-0.5 ${TILE.mist}`}
          >
            <span className="inline-flex rounded-full bg-[var(--surface)] px-3 py-1 text-[11px] font-semibold">
              Prochain salon
            </span>
            <div className="mt-4 flex items-start gap-3">
              <SalonLogo
                slug={featuredSalon.catalogSlug}
                name={featuredSalon.name}
                size={56}
              />
              <div className="min-w-0">
                <h3 className="text-xl font-semibold tracking-tight">{featuredSalon.name}</h3>
                <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
                  {formatShortDate(featuredSalon.startDate)} →{" "}
                  {formatShortDate(featuredSalon.endDate)}
                  {featuredSalon.location ? ` · ${featuredSalon.location}` : ""}
                </p>
                <p className="mt-2 text-xs text-[color:var(--foreground)]/50">
                  {SALON_MODE_LABELS[featuredSalon.mode]} ·{" "}
                  {checklistProgress(checklistBySalon.get(featuredSalon.id) ?? [])}% checklist
                </p>
              </div>
            </div>
          </Link>
        )}

        {/* Alerts */}
        <section
          className={`md:col-span-3 rounded-[1.75rem] p-5 ${
            alerts.length ? TILE.alert : TILE.surface
          }`}
        >
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em]">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            Points d’attention
          </div>
          {alerts.length === 0 ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-[color:var(--foreground)]/55">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
              Rien de bloquant pour l’instant.
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {alerts.map((a) => (
                <li key={a.text} className="text-sm">
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

        {/* Upcoming checklist strip */}
        <section className={`md:col-span-2 rounded-[1.75rem] p-5 ${TILE.surface}`}>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/45">
            Suite de la checklist
          </h3>
          {upcomingTodos.length <= 1 ? (
            <p className="mt-3 text-sm text-[color:var(--foreground)]/50">Liste à jour.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {upcomingTodos.slice(1).map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/v3/salons/${t.salonId}#checklist`}
                    className="block rounded-xl px-1 py-1 hover:bg-[var(--surface-soft)]"
                  >
                    <p className="text-[10px] text-[color:var(--foreground)]/45">
                      {formatShortDate(t.dueDate ?? "")}
                      {t.salon ? ` · ${t.salon.name}` : ""}
                    </p>
                    <p className="text-sm leading-snug">{t.label}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Salon portfolio tiles */}
        {yearSalons.map((s, idx) => (
          <SalonBentoTile
            key={s.id}
            salon={s}
            progress={checklistProgress(checklistBySalon.get(s.id) ?? [])}
            engaged={budgetBySalon.get(s.id)?.engaged ?? 0}
            large={idx === 1 || idx === 4}
          />
        ))}

        {yearSalons.length === 0 && (
          <section className={`md:col-span-4 rounded-[1.75rem] border border-dashed border-[var(--line-strong)] p-8 ${TILE.mist}`}>
            <h3 className="text-lg font-semibold">Aucun salon en {year}</h3>
            <p className="mt-2 max-w-md text-sm text-[color:var(--foreground)]/55">
              Choisis SPACE, EuroTier, VIV… dans le catalogue, ou importe le portefeuille 2026.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
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
        )}
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

function SalonBentoTile({
  salon,
  progress,
  engaged,
  large,
}: {
  salon: Salon;
  progress: number;
  engaged: number;
  large?: boolean;
}) {
  return (
    <Link
      href={`/v3/salons/${salon.id}`}
      className={[
        "group rounded-[1.75rem] p-4 transition hover:-translate-y-0.5",
        large ? "md:col-span-3" : "md:col-span-2",
        TILE.surface,
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <SalonLogo slug={salon.catalogSlug} name={salon.name} size={large ? 52 : 40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold tracking-tight group-hover:underline">
              {salon.name}
            </h3>
            <span className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] font-semibold">
              {SALON_MODE_LABELS[salon.mode]}
            </span>
          </div>
          <p className="mt-1 text-xs text-[color:var(--foreground)]/50">
            {formatShortDate(salon.startDate)} → {formatShortDate(salon.endDate)}
            {salon.location ? ` · ${salon.location}` : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[color:var(--foreground)]/55">
            <span>{SALON_STATUS_LABELS[salon.status]}</span>
            {(salon.hall || salon.standNumber) && (
              <span>
                {[salon.hall, salon.standNumber].filter(Boolean).join(" / ")}
                {salon.surfaceM2 != null ? ` · ${salon.surfaceM2} m²` : ""}
              </span>
            )}
            <span>{progress}%</span>
            {engaged > 0 && <span>{formatMoney(engaged)}</span>}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-soft)]">
            <div
              className="h-full rounded-full bg-[var(--accent)]"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
