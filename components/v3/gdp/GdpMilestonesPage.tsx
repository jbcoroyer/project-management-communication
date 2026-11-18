"use client";

import { useState } from "react";
import { Milestone, Plus } from "lucide-react";
import { TuesdayLoader } from "@/components/brand";
import V2PageHeader from "../../v2/V2PageHeader";
import MetierEmptyState from "../metier/MetierEmptyState";
import {
  MetierField,
  metierInputClass,
  metierSelectClass,
} from "../metier/MetierField";
import { useGdpSpace } from "../../../lib/useGdpSpace";
import {
  GDP_MILESTONE_STATUS_OPTIONS,
  type GdpMilestoneStatus,
} from "../../../lib/gdpTypes";

export default function GdpMilestonesPage() {
  const { projects, milestones, loading, addMilestone, patchMilestone } = useGdpSpace();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isCritical, setIsCritical] = useState(false);
  const [saving, setSaving] = useState(false);

  const effectiveProjectId = projectId || projects[0]?.id || "";

  const submit = async () => {
    if (!name.trim() || !effectiveProjectId) return;
    setSaving(true);
    const created = await addMilestone({
      projectId: effectiveProjectId,
      name,
      dueDate: dueDate || null,
      isCritical,
    });
    setSaving(false);
    if (created) {
      setOpen(false);
      setName("");
      setDueDate("");
      setIsCritical(false);
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
        kicker="Gestion de Projet"
        title="Planification"
        description="Jalons transverses du portfolio — dates clés, critiques et statut."
        icon={Milestone}
        aside={
          <button
            type="button"
            className="ui-btn ui-btn-primary text-xs"
            disabled={projects.length === 0}
            onClick={() => setOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Nouveau jalon
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
            <MetierField label="Date">
              <input type="date" className={metierInputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </MetierField>
            <MetierField label="Nom" className="md:col-span-2">
              <input className={metierInputClass} value={name} onChange={(e) => setName(e.target.value)} />
            </MetierField>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isCritical} onChange={(e) => setIsCritical(e.target.checked)} />
              Jalon critique
            </label>
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

      {milestones.length === 0 && !open ? (
        <MetierEmptyState
          icon={Milestone}
          title="Aucun jalon"
          description="Ajoutez des dates clés (kick-off, revue, go-live) rattachées aux projets."
          actionLabel={projects.length ? "Nouveau jalon" : undefined}
          onAction={projects.length ? () => setOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-2">
          {milestones.map((m) => {
            const project = projects.find((p) => p.id === m.projectId);
            return (
              <div key={m.id} className="ui-surface flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3">
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-[12px] text-[color:var(--foreground)]/50">
                    {project?.name ?? "Projet"} · {m.dueDate ?? "Sans date"}
                    {m.isCritical ? " · critique" : ""}
                  </p>
                </div>
                <select
                  className={`${metierSelectClass} w-auto`}
                  value={m.status}
                  onChange={(e) =>
                    void patchMilestone(m.id, { status: e.target.value as GdpMilestoneStatus })
                  }
                  aria-label={`Statut jalon ${m.name}`}
                >
                  {GDP_MILESTONE_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
