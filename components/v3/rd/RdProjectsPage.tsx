"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FlaskConical, Plus } from "lucide-react";
import { TuesdayLoader } from "@/components/brand";
import V2PageHeader from "../../v2/V2PageHeader";
import MetierEmptyState from "../metier/MetierEmptyState";
import StatusPill from "../metier/StatusPill";
import {
  MetierField,
  metierInputClass,
  metierSelectClass,
  metierTextareaClass,
} from "../metier/MetierField";
import { useRdSpace } from "../../../lib/useRdSpace";
import {
  labelForOption,
  RD_HORIZON_OPTIONS,
  RD_MATURITY_OPTIONS,
  RD_PHASE_OPTIONS,
  RD_RISK_OPTIONS,
  type RdHorizon,
  type RdMaturity,
  type RdPhase,
  type RdRisk,
} from "../../../lib/rdTypes";

export default function RdProjectsPage() {
  const search = useSearchParams();
  const { projects, loading, addProject } = useRdSpace();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [outcome, setOutcome] = useState("");
  const [maturity, setMaturity] = useState<RdMaturity>("idee");
  const [phase, setPhase] = useState<RdPhase>("cadrage");
  const [risk, setRisk] = useState<RdRisk>("moyen");
  const [horizon, setHorizon] = useState<RdHorizon>("moyen");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (search.get("new") === "1") setOpen(true);
  }, [search]);

  const byPhase = useMemo(() => {
    const map = new Map<string, typeof projects>();
    for (const opt of RD_PHASE_OPTIONS) map.set(opt.value, []);
    for (const p of projects) {
      const bucket = map.get(p.phase) ?? [];
      bucket.push(p);
      map.set(p.phase, bucket);
    }
    return RD_PHASE_OPTIONS.map((opt) => ({
      ...opt,
      items: map.get(opt.value) ?? [],
    })).filter((col) => col.items.length > 0 || projects.length === 0);
  }, [projects]);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const created = await addProject({ name, outcome, maturity, phase, risk, horizon });
    setSaving(false);
    if (created) {
      setOpen(false);
      setName("");
      setOutcome("");
    }
  };

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
        kicker="R&D"
        title="Projets"
        description="Initiatives portfolio : outcome, maturité, phase stage-gate et risque."
        icon={FlaskConical}
        aside={
          <button type="button" className="ui-btn ui-btn-primary text-xs" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Nouveau projet
          </button>
        }
      />

      {open ? (
        <div className="ui-surface space-y-3 rounded-2xl p-4">
          <h2 className="text-sm font-semibold">Créer un projet R&D</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <MetierField label="Nom">
              <input className={metierInputClass} value={name} onChange={(e) => setName(e.target.value)} />
            </MetierField>
            <MetierField label="Maturité">
              <select className={metierSelectClass} value={maturity} onChange={(e) => setMaturity(e.target.value as RdMaturity)}>
                {RD_MATURITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </MetierField>
            <MetierField label="Phase" className="md:col-span-2">
              <select className={metierSelectClass} value={phase} onChange={(e) => setPhase(e.target.value as RdPhase)}>
                {RD_PHASE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </MetierField>
            <MetierField label="Risque">
              <select className={metierSelectClass} value={risk} onChange={(e) => setRisk(e.target.value as RdRisk)}>
                {RD_RISK_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </MetierField>
            <MetierField label="Horizon">
              <select className={metierSelectClass} value={horizon} onChange={(e) => setHorizon(e.target.value as RdHorizon)}>
                {RD_HORIZON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </MetierField>
            <MetierField label="Outcome attendu" className="md:col-span-2">
              <textarea className={metierTextareaClass} value={outcome} onChange={(e) => setOutcome(e.target.value)} />
            </MetierField>
          </div>
          <div className="flex gap-2">
            <button type="button" className="ui-btn ui-btn-primary text-xs" disabled={saving} onClick={() => void submit()}>
              Enregistrer
            </button>
            <button type="button" className="ui-btn ui-btn-ghost text-xs" onClick={() => setOpen(false)}>
              Annuler
            </button>
          </div>
        </div>
      ) : null}

      {projects.length === 0 && !open ? (
        <MetierEmptyState
          icon={FlaskConical}
          title="Portfolio vide"
          description="Un projet R&D porte un outcome et des kill criteria — pas une carte Kanban."
          actionLabel="Créer un projet"
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {byPhase.map((col) => (
            <div key={col.value} className="w-64 shrink-0 space-y-2">
              <p className="px-1 text-[11px] font-medium uppercase tracking-[0.1em] text-[color:var(--foreground)]/40">
                {col.label} ({col.items.length})
              </p>
              {col.items.map((p) => (
                <Link
                  key={p.id}
                  href={`/v3/rd/projets/${p.id}`}
                  className="ui-surface block rounded-xl px-3 py-3 hover:ring-1 hover:ring-[var(--accent)]/25"
                >
                  <p className="font-medium text-[var(--foreground)]">{p.name}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-[color:var(--foreground)]/50">
                    {p.outcome || "—"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <StatusPill label={labelForOption(RD_MATURITY_OPTIONS, p.maturity)} tone="accent" />
                    <StatusPill
                      label={labelForOption(RD_RISK_OPTIONS, p.risk)}
                      tone={p.risk === "eleve" ? "rouge" : "neutre"}
                    />
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
