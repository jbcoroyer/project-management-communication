"use client";

import { useState } from "react";
import { AlertTriangle, Plus } from "lucide-react";
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
import { useGdpSpace } from "../../../lib/useGdpSpace";
import {
  GDP_RISK_STATUS_OPTIONS,
  gdpRiskScore,
  labelForOption,
  type GdpRiskStatus,
} from "../../../lib/gdpTypes";

export default function GdpRisksPage() {
  const { projects, risks, loading, addRisk, patchRisk } = useGdpSpace();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [probability, setProbability] = useState(2);
  const [impact, setImpact] = useState(2);
  const [mitigationPlan, setMitigationPlan] = useState("");
  const [saving, setSaving] = useState(false);

  const effectiveProjectId = projectId || projects[0]?.id || "";

  const submit = async () => {
    if (!title.trim() || !effectiveProjectId) return;
    setSaving(true);
    const created = await addRisk({
      projectId: effectiveProjectId,
      title,
      probability,
      impact,
      mitigationPlan,
    });
    setSaving(false);
    if (created) {
      setOpen(false);
      setTitle("");
      setMitigationPlan("");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <TuesdayLoader />
      </div>
    );
  }

  const sorted = [...risks].sort(
    (a, b) => gdpRiskScore(b.probability, b.impact) - gdpRiskScore(a.probability, a.impact),
  );

  return (
    <div className="space-y-5">
      <V2PageHeader
        kicker="Gestion de Projet"
        title="Risques"
        description="Registre léger : probabilité × impact, mitigation et statut."
        icon={AlertTriangle}
        aside={
          <button
            type="button"
            className="ui-btn ui-btn-primary text-xs"
            disabled={projects.length === 0}
            onClick={() => setOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Nouveau risque
          </button>
        }
      />

      {open ? (
        <div className="ui-surface space-y-3 rounded-2xl p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <MetierField label="Projet">
              <select
                className={metierSelectClass}
                value={effectiveProjectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </MetierField>
            <MetierField label="Titre">
              <input className={metierInputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
            </MetierField>
            <MetierField label="Probabilité (1–5)">
              <input
                type="number"
                min={1}
                max={5}
                className={metierInputClass}
                value={probability}
                onChange={(e) => setProbability(Number(e.target.value) || 1)}
              />
            </MetierField>
            <MetierField label="Impact (1–5)">
              <input
                type="number"
                min={1}
                max={5}
                className={metierInputClass}
                value={impact}
                onChange={(e) => setImpact(Number(e.target.value) || 1)}
              />
            </MetierField>
            <MetierField label="Plan de mitigation" className="md:col-span-2">
              <textarea
                className={metierTextareaClass}
                value={mitigationPlan}
                onChange={(e) => setMitigationPlan(e.target.value)}
              />
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

      {sorted.length === 0 && !open ? (
        <MetierEmptyState
          icon={AlertTriangle}
          title="Registre vide"
          description="Capturez les menaces et opportunités liées aux projets du portfolio."
          actionLabel={projects.length ? "Nouveau risque" : undefined}
          onAction={projects.length ? () => setOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-2">
          {sorted.map((r) => {
            const project = projects.find((p) => p.id === r.projectId);
            const score = gdpRiskScore(r.probability, r.impact);
            return (
              <div key={r.id} className="ui-surface rounded-xl px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-[12px] text-[color:var(--foreground)]/50">
                      {project?.name ?? "Projet"} · P{r.probability} × I{r.impact}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusPill
                      label={`Score ${score}`}
                      tone={score >= 15 ? "rouge" : score >= 8 ? "orange" : "vert"}
                    />
                    <StatusPill label={labelForOption(GDP_RISK_STATUS_OPTIONS, r.status)} />
                  </div>
                </div>
                <div className="mt-2">
                  <select
                    className={`${metierSelectClass} max-w-xs`}
                    value={r.status}
                    onChange={(e) =>
                      void patchRisk(r.id, { status: e.target.value as GdpRiskStatus })
                    }
                  >
                    {GDP_RISK_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
