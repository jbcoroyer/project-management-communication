"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarRange, Plus, Sprout, Wallet } from "lucide-react";
import { TuesdayLoader } from "@/components/brand";
import V2PageHeader from "../v2/V2PageHeader";
import CreateSalonModal from "./CreateSalonModal";
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

export default function SalonsDashboard() {
  const {
    salons,
    checklist,
    budgetLines,
    loading,
    addSalon,
    seedYear,
  } = useSalons();
  const [year, setYear] = useState(2026);
  const [createOpen, setCreateOpen] = useState(false);

  const yearSalons = useMemo(
    () =>
      salons.filter(
        (s) =>
          s.startDate.startsWith(String(year)) || s.endDate.startsWith(String(year)),
      ),
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
    const nameById = new Map(salons.map((s) => [s.id, s.name]));
    return checklist
      .filter((c) => !c.done && c.dueDate)
      .map((c) => ({
        ...c,
        salonName: nameById.get(c.salonId) ?? "Salon",
      }))
      .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
      .slice(0, 8);
  }, [checklist, salons]);

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
    const out: string[] = [];
    const today = new Date().toISOString().slice(0, 10);
    for (let i = 0; i < yearSalons.length; i++) {
      for (let j = i + 1; j < yearSalons.length; j++) {
        const a = yearSalons[i];
        const b = yearSalons[j];
        if (datesOverlap(a.startDate, a.endDate, b.startDate, b.endDate)) {
          out.push(`Chevauchement : ${a.name} ↔ ${b.name}`);
        }
      }
    }
    for (const c of checklist) {
      if (!c.done && c.dueDate && c.dueDate < today) {
        const salon = salons.find((s) => s.id === c.salonId);
        out.push(`En retard : ${c.label} (${salon?.name ?? "salon"})`);
      }
    }
    for (const line of budgetLines) {
      if (!line.paid && line.dueDate && line.dueDate < today) {
        const salon = salons.find((s) => s.id === line.salonId);
        out.push(`Paiement en retard : ${line.label} (${salon?.name ?? "salon"})`);
      }
    }
    return out.slice(0, 6);
  }, [budgetLines, checklist, salons, yearSalons]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <TuesdayLoader />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <V2PageHeader
        kicker="Communication"
        title="Salons"
        description="Portefeuille : prochains salons, checklist à venir, budget — puis détail au clic."
        icon={CalendarRange}
        aside={
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
            <button
              type="button"
              className="ui-btn ui-btn-primary text-xs"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Nouveau salon
            </button>
          </div>
        }
      />

      {alerts.length > 0 && (
        <div className="ui-surface rounded-2xl border border-amber-500/30 px-4 py-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            Alertes
          </div>
          <ul className="space-y-1 text-xs text-[color:var(--foreground)]/70">
            {alerts.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <section className="ui-surface rounded-2xl p-4 lg:col-span-1">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[color:var(--foreground)]/40">
            Prochains salons
          </h2>
          {yearSalons.length === 0 ? (
            <p className="mt-3 text-sm text-[color:var(--foreground)]/50">
              Aucun salon {year}. Seed 2026 ou crée-en un.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {yearSalons.map((s) => (
                <SalonRow
                  key={s.id}
                  salon={s}
                  progress={checklistProgress(checklistBySalon.get(s.id) ?? [])}
                  engaged={budgetBySalon.get(s.id)?.engaged ?? 0}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="ui-surface rounded-2xl p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[color:var(--foreground)]/40">
            À faire bientôt
          </h2>
          {upcomingTodos.length === 0 ? (
            <p className="mt-3 text-sm text-[color:var(--foreground)]/50">Rien d’urgent.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {upcomingTodos.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/v3/salons/${t.salonId}#checklist`}
                    className="block rounded-xl px-2 py-1.5 hover:bg-[color:var(--foreground)]/[0.04]"
                  >
                    <p className="text-[11px] text-[color:var(--foreground)]/45">
                      {formatShortDate(t.dueDate ?? "")} · {t.salonName}
                    </p>
                    <p className="text-sm">{t.label}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ui-surface rounded-2xl p-4">
          <h2 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[color:var(--foreground)]/40">
            <Wallet className="h-3.5 w-3.5" aria-hidden />
            Budget {year}
          </h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] uppercase text-[color:var(--foreground)]/40">Engagé</p>
              <p className="text-sm font-semibold">{formatMoney(yearBudget.engaged)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-[color:var(--foreground)]/40">Payé</p>
              <p className="text-sm font-semibold">{formatMoney(yearBudget.paid)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-[color:var(--foreground)]/40">Reste</p>
              <p className="text-sm font-semibold">{formatMoney(yearBudget.reste)}</p>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5 border-t border-[color:var(--foreground)]/10 pt-3">
            {yearSalons.map((s) => {
              const eng = budgetBySalon.get(s.id)?.engaged ?? 0;
              if (!eng) return null;
              return (
                <li key={s.id} className="flex justify-between text-xs">
                  <Link href={`/v3/salons/${s.id}`} className="hover:underline">
                    {s.name}
                  </Link>
                  <span>{formatMoney(eng)}</span>
                </li>
              );
            })}
          </ul>
        </section>
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

function SalonRow({
  salon,
  progress,
  engaged,
}: {
  salon: Salon;
  progress: number;
  engaged: number;
}) {
  return (
    <li>
      <Link
        href={`/v3/salons/${salon.id}`}
        className="block rounded-xl border border-[color:var(--foreground)]/8 px-3 py-2 hover:border-[color:var(--accent)]/40"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{salon.name}</p>
            <p className="text-[11px] text-[color:var(--foreground)]/45">
              {formatShortDate(salon.startDate)} → {formatShortDate(salon.endDate)}
              {salon.location ? ` · ${salon.location}` : ""}
            </p>
          </div>
          <span className="rounded-full bg-[color:var(--foreground)]/6 px-2 py-0.5 text-[10px] font-semibold">
            {salon.mode} · {SALON_MODE_LABELS[salon.mode]}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-[color:var(--foreground)]/55">
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
      </Link>
    </li>
  );
}
