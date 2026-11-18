"use client";

import { useState } from "react";
import { Gavel, Plus } from "lucide-react";
import { TuesdayLoader } from "@/components/brand";
import V2PageHeader from "../../v2/V2PageHeader";
import MetierEmptyState from "../metier/MetierEmptyState";
import {
  MetierField,
  metierInputClass,
  metierSelectClass,
  metierTextareaClass,
} from "../metier/MetierField";
import { useGdpSpace } from "../../../lib/useGdpSpace";

export default function GdpDecisionsPage() {
  const { projects, decisions, loading, addDecision } = useGdpSpace();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [decidedAt, setDecidedAt] = useState(new Date().toISOString().slice(0, 10));
  const [context, setContext] = useState("");
  const [decision, setDecision] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [saving, setSaving] = useState(false);

  const effectiveProjectId = projectId || projects[0]?.id || "";

  const submit = async () => {
    if (!title.trim() || !effectiveProjectId) return;
    setSaving(true);
    const created = await addDecision({
      projectId: effectiveProjectId,
      title,
      decidedAt,
      context,
      decision,
      followUp,
    });
    setSaving(false);
    if (created) {
      setOpen(false);
      setTitle("");
      setContext("");
      setDecision("");
      setFollowUp("");
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
        title="Décisions"
        description="Journal daté des choix structurants — contexte, décision, suivi."
        icon={Gavel}
        aside={
          <button
            type="button"
            className="ui-btn ui-btn-primary text-xs"
            disabled={projects.length === 0}
            onClick={() => setOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Nouvelle décision
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
              <input type="date" className={metierInputClass} value={decidedAt} onChange={(e) => setDecidedAt(e.target.value)} />
            </MetierField>
            <MetierField label="Titre" className="md:col-span-2">
              <input className={metierInputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
            </MetierField>
            <MetierField label="Contexte" className="md:col-span-2">
              <textarea className={metierTextareaClass} value={context} onChange={(e) => setContext(e.target.value)} />
            </MetierField>
            <MetierField label="Décision" className="md:col-span-2">
              <textarea className={metierTextareaClass} value={decision} onChange={(e) => setDecision(e.target.value)} />
            </MetierField>
            <MetierField label="Suivi" className="md:col-span-2">
              <textarea className={metierTextareaClass} value={followUp} onChange={(e) => setFollowUp(e.target.value)} />
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

      {decisions.length === 0 && !open ? (
        <MetierEmptyState
          icon={Gavel}
          title="Journal vide"
          description="Enregistrez les arbitrages pour garder la trace du « pourquoi »."
          actionLabel={projects.length ? "Nouvelle décision" : undefined}
          onAction={projects.length ? () => setOpen(true) : undefined}
        />
      ) : (
        <div className="space-y-2">
          {decisions.map((d) => {
            const project = projects.find((p) => p.id === d.projectId);
            return (
              <div key={d.id} className="ui-surface rounded-xl px-4 py-3">
                <p className="text-[11px] text-[color:var(--foreground)]/45">
                  {d.decidedAt} · {project?.name ?? "Projet"}
                </p>
                <p className="mt-0.5 font-medium">{d.title}</p>
                {d.decision ? (
                  <p className="mt-1 text-sm text-[color:var(--foreground)]/70">{d.decision}</p>
                ) : null}
                {d.followUp ? (
                  <p className="mt-1 text-[12px] text-[color:var(--foreground)]/50">
                    Suivi : {d.followUp}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
