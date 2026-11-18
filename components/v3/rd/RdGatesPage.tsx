"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Scale } from "lucide-react";
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
  RD_GATE_DECISION_OPTIONS,
  RD_GATE_STATUS_OPTIONS,
  RD_PHASE_OPTIONS,
  type RdGateDecision,
  type RdPhase,
} from "../../../lib/rdTypes";

export default function RdGatesPage() {
  const search = useSearchParams();
  const { projects, gates, loading, addGate, applyGateDecision } = useRdSpace();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [targetPhase, setTargetPhase] = useState<RdPhase>("preuve");
  const [reviewDate, setReviewDate] = useState("");
  const [criteria, setCriteria] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const pre = search.get("project");
    if (pre) {
      setProjectId(pre);
      setOpen(true);
    }
  }, [search]);

  useEffect(() => {
    if (!projectId && projects[0]) setProjectId(projects[0].id);
  }, [projectId, projects]);

  const submit = async () => {
    if (!name.trim() || !projectId) return;
    setSaving(true);
    const created = await addGate({
      projectId,
      name,
      targetPhase,
      reviewDate: reviewDate || null,
      criteria,
    });
    setSaving(false);
    if (created) {
      setOpen(false);
      setName("");
      setCriteria("");
      setReviewDate("");
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
        title="Gates & revues"
        description="Décisions go / no-go / pivot qui font avancer la phase projet — pas un glisser-déposer de carte."
        icon={Scale}
        aside={
          <button
            type="button"
            className="ui-btn ui-btn-primary text-xs"
            disabled={projects.length === 0}
            onClick={() => setOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Programmer
          </button>
        }
      />

      {projects.length === 0 ? (
        <MetierEmptyState
          icon={Scale}
          title="Créez d’abord un projet"
          description="Une gate tranche une phase d’un projet R&D."
          actionLabel="Aller aux projets"
          onAction={() => {
            window.location.href = "/v3/rd/projets?new=1";
          }}
        />
      ) : null}

      {open ? (
        <div className="ui-surface space-y-3 rounded-2xl p-4">
          <h2 className="text-sm font-semibold">Programmer une gate</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <MetierField label="Projet">
              <select className={metierSelectClass} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </MetierField>
            <MetierField label="Phase cible">
              <select
                className={metierSelectClass}
                value={targetPhase}
                onChange={(e) => setTargetPhase(e.target.value as RdPhase)}
              >
                {RD_PHASE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </MetierField>
            <MetierField label="Nom">
              <input className={metierInputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Gate 2 — preuve lab" />
            </MetierField>
            <MetierField label="Date de revue">
              <input type="date" className={metierInputClass} value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
            </MetierField>
            <MetierField label="Critères" className="md:col-span-2">
              <textarea className={metierTextareaClass} value={criteria} onChange={(e) => setCriteria(e.target.value)} />
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

      {gates.length === 0 && !open && projects.length > 0 ? (
        <MetierEmptyState
          icon={Scale}
          title="Aucune gate"
          description="Programmez une revue formelle avec critères et décideurs."
          actionLabel="Programmer une gate"
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="space-y-2">
          {gates.map((g) => {
            const project = projects.find((p) => p.id === g.projectId);
            return (
              <div key={g.id} className="ui-surface rounded-xl px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{g.name}</p>
                    <p className="text-[12px] text-[color:var(--foreground)]/50">
                      {project?.name ?? "Projet"} · phase cible{" "}
                      {labelForOption(RD_PHASE_OPTIONS, g.targetPhase)} ·{" "}
                      {g.reviewDate ?? "date libre"}
                    </p>
                    {g.criteria ? (
                      <p className="mt-1 line-clamp-2 text-sm text-[color:var(--foreground)]/65">{g.criteria}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <StatusPill label={labelForOption(RD_GATE_STATUS_OPTIONS, g.status)} tone="accent" />
                    {g.decision ? (
                      <StatusPill
                        label={labelForOption(RD_GATE_DECISION_OPTIONS, g.decision)}
                        tone={
                          g.decision === "go"
                            ? "vert"
                            : g.decision === "no_go"
                              ? "rouge"
                              : "orange"
                        }
                      />
                    ) : null}
                  </div>
                </div>
                {!g.decision ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {RD_GATE_DECISION_OPTIONS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        className="ui-btn ui-btn-ghost h-8 text-[11px]"
                        onClick={() => void applyGateDecision(g, d.value as RdGateDecision)}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
