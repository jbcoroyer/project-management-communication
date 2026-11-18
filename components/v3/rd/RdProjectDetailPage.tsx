"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Beaker, Scale } from "lucide-react";
import { TuesdayLoader } from "@/components/brand";
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

export default function RdProjectDetailPage({ projectId }: { projectId: string }) {
  const { projects, experiences, gates, loading, patchProject } = useRdSpace();
  const project = projects.find((p) => p.id === projectId);
  const [saving, setSaving] = useState(false);

  const linkedExperiences = useMemo(
    () => experiences.filter((e) => e.projectId === projectId),
    [experiences, projectId],
  );
  const linkedGates = useMemo(
    () => gates.filter((g) => g.projectId === projectId),
    [gates, projectId],
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <TuesdayLoader />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-3">
        <Link href="/v3/rd/projets" className="inline-flex items-center gap-1 text-sm text-[var(--accent)]">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        <p className="text-sm text-[color:var(--foreground)]/55">Projet introuvable.</p>
      </div>
    );
  }

  const save = async (patch: Parameters<typeof patchProject>[1]) => {
    setSaving(true);
    await patchProject(project.id, patch);
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <Link href="/v3/rd/projets" className="inline-flex items-center gap-1 text-sm text-[var(--accent)]">
        <ArrowLeft className="h-4 w-4" /> Projets
      </Link>

      <header className="ui-surface rounded-2xl border-l-4 border-l-[var(--accent)] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              Projet R&D
            </p>
            <h1 className="ui-heading mt-1 text-2xl font-semibold">{project.name}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusPill label={labelForOption(RD_PHASE_OPTIONS, project.phase)} tone="accent" />
              <StatusPill label={labelForOption(RD_MATURITY_OPTIONS, project.maturity)} />
              <StatusPill
                label={labelForOption(RD_RISK_OPTIONS, project.risk)}
                tone={project.risk === "eleve" ? "rouge" : project.risk === "moyen" ? "orange" : "vert"}
              />
            </div>
          </div>
          <p className="text-[11px] text-[color:var(--foreground)]/40">{saving ? "Enregistrement…" : null}</p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="ui-surface space-y-3 rounded-2xl p-4">
          <h2 className="text-sm font-semibold">Pilotage</h2>
          <MetierField label="Nom">
            <input
              className={metierInputClass}
              defaultValue={project.name}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== project.name) {
                  void save({ name: e.target.value });
                }
              }}
            />
          </MetierField>
          <MetierField label="Outcome">
            <textarea
              className={metierTextareaClass}
              defaultValue={project.outcome}
              onBlur={(e) => {
                if (e.target.value !== project.outcome) void save({ outcome: e.target.value });
              }}
            />
          </MetierField>
          <div className="grid grid-cols-2 gap-3">
            <MetierField label="Phase">
              <select
                className={metierSelectClass}
                value={project.phase}
                onChange={(e) => void save({ phase: e.target.value as RdPhase })}
              >
                {RD_PHASE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </MetierField>
            <MetierField label="Maturité">
              <select
                className={metierSelectClass}
                value={project.maturity}
                onChange={(e) => void save({ maturity: e.target.value as RdMaturity })}
              >
                {RD_MATURITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </MetierField>
            <MetierField label="Risque">
              <select
                className={metierSelectClass}
                value={project.risk}
                onChange={(e) => void save({ risk: e.target.value as RdRisk })}
              >
                {RD_RISK_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </MetierField>
            <MetierField label="Horizon">
              <select
                className={metierSelectClass}
                value={project.horizon}
                onChange={(e) => void save({ horizon: e.target.value as RdHorizon })}
              >
                {RD_HORIZON_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </MetierField>
          </div>
          <MetierField label="Kill criteria">
            <textarea
              className={metierTextareaClass}
              defaultValue={project.killCriteria}
              onBlur={(e) => {
                if (e.target.value !== project.killCriteria) {
                  void save({ killCriteria: e.target.value });
                }
              }}
            />
          </MetierField>
        </div>

        <div className="space-y-4">
          <div className="ui-surface rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Beaker className="h-4 w-4 text-[var(--accent)]" />
                <h2 className="text-sm font-semibold">Expériences</h2>
              </div>
              <Link href={`/v3/rd/experiences?project=${project.id}`} className="text-xs text-[var(--accent)]">
                Ajouter
              </Link>
            </div>
            {linkedExperiences.length === 0 ? (
              <p className="text-sm text-[color:var(--foreground)]/50">Aucune expérience liée.</p>
            ) : (
              <ul className="space-y-2">
                {linkedExperiences.map((e) => (
                  <li key={e.id} className="rounded-lg bg-[var(--surface-soft)] px-3 py-2 text-sm">
                    <p className="font-medium">{e.title}</p>
                    <p className="text-[11px] text-[color:var(--foreground)]/50">
                      {e.status} · {e.verdict ?? "sans verdict"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="ui-surface rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-[var(--accent)]" />
                <h2 className="text-sm font-semibold">Gates</h2>
              </div>
              <Link href={`/v3/rd/gates?project=${project.id}`} className="text-xs text-[var(--accent)]">
                Planifier
              </Link>
            </div>
            {linkedGates.length === 0 ? (
              <p className="text-sm text-[color:var(--foreground)]/50">Aucune gate planifiée.</p>
            ) : (
              <ul className="space-y-2">
                {linkedGates.map((g) => (
                  <li key={g.id} className="rounded-lg bg-[var(--surface-soft)] px-3 py-2 text-sm">
                    <p className="font-medium">{g.name}</p>
                    <p className="text-[11px] text-[color:var(--foreground)]/50">
                      {g.reviewDate ?? "Date libre"} · {g.decision ?? g.status}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
