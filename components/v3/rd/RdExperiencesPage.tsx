"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Beaker, Plus } from "lucide-react";
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
  RD_EXPERIENCE_STATUS_OPTIONS,
  RD_EXPERIENCE_TYPE_OPTIONS,
  RD_VERDICT_OPTIONS,
  type RdExperienceStatus,
  type RdExperienceType,
  type RdVerdict,
} from "../../../lib/rdTypes";

export default function RdExperiencesPage() {
  const search = useSearchParams();
  const { projects, experiences, loading, addExperience, patchExperience } = useRdSpace();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [protocol, setProtocol] = useState("");
  const [experienceType, setExperienceType] = useState<RdExperienceType>("lab");
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
    if (!title.trim() || !projectId) return;
    setSaving(true);
    const created = await addExperience({
      projectId,
      title,
      hypothesis,
      protocol,
      experienceType,
    });
    setSaving(false);
    if (created) {
      setOpen(false);
      setTitle("");
      setHypothesis("");
      setProtocol("");
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
        title="Expériences"
        description="Protocole, résultat brut et verdict — la preuve d’hypothèse, pas une tâche terminée."
        icon={Beaker}
        aside={
          <button
            type="button"
            className="ui-btn ui-btn-primary text-xs"
            disabled={projects.length === 0}
            onClick={() => setOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Planifier
          </button>
        }
      />

      {projects.length === 0 ? (
        <MetierEmptyState
          icon={Beaker}
          title="Créez d’abord un projet"
          description="Une expérience est toujours rattachée à un projet R&D."
          actionLabel="Aller aux projets"
          onAction={() => {
            window.location.href = "/v3/rd/projets?new=1";
          }}
        />
      ) : null}

      {open ? (
        <div className="ui-surface space-y-3 rounded-2xl p-4">
          <h2 className="text-sm font-semibold">Nouvelle expérience</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <MetierField label="Projet">
              <select className={metierSelectClass} value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </MetierField>
            <MetierField label="Type">
              <select
                className={metierSelectClass}
                value={experienceType}
                onChange={(e) => setExperienceType(e.target.value as RdExperienceType)}
              >
                {RD_EXPERIENCE_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </MetierField>
            <MetierField label="Titre" className="md:col-span-2">
              <input className={metierInputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
            </MetierField>
            <MetierField label="Hypothèse testée" className="md:col-span-2">
              <textarea className={metierTextareaClass} value={hypothesis} onChange={(e) => setHypothesis(e.target.value)} />
            </MetierField>
            <MetierField label="Protocole / méthode" className="md:col-span-2">
              <textarea className={metierTextareaClass} value={protocol} onChange={(e) => setProtocol(e.target.value)} />
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

      {experiences.length === 0 && !open && projects.length > 0 ? (
        <MetierEmptyState
          icon={Beaker}
          title="Aucune expérience"
          description="Planifiez un run lab / terrain pour trancher une hypothèse."
          actionLabel="Planifier une expérience"
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="space-y-2">
          {experiences.map((e) => {
            const project = projects.find((p) => p.id === e.projectId);
            return (
              <div key={e.id} className="ui-surface rounded-xl px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{e.title}</p>
                    <p className="text-[12px] text-[color:var(--foreground)]/50">
                      {project?.name ?? "Projet"} · {labelForOption(RD_EXPERIENCE_TYPE_OPTIONS, e.experienceType)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-[color:var(--foreground)]/70">
                      {e.hypothesis || "Hypothèse non renseignée"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <StatusPill label={labelForOption(RD_EXPERIENCE_STATUS_OPTIONS, e.status)} tone="accent" />
                    {e.verdict ? (
                      <StatusPill
                        label={labelForOption(RD_VERDICT_OPTIONS, e.verdict)}
                        tone={e.verdict === "infirme" ? "rouge" : e.verdict === "confirme" ? "vert" : "orange"}
                      />
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <MetierField label="Statut">
                    <select
                      className={metierSelectClass}
                      value={e.status}
                      onChange={(ev) =>
                        void patchExperience(e.id, { status: ev.target.value as RdExperienceStatus })
                      }
                    >
                      {RD_EXPERIENCE_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </MetierField>
                  <MetierField label="Verdict">
                    <select
                      className={metierSelectClass}
                      value={e.verdict ?? ""}
                      onChange={(ev) =>
                        void patchExperience(e.id, {
                          verdict: (ev.target.value || null) as RdVerdict | null,
                        })
                      }
                    >
                      <option value="">Sans verdict</option>
                      {RD_VERDICT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </MetierField>
                  <MetierField label="Résultat brut">
                    <input
                      className={metierInputClass}
                      defaultValue={e.rawResult}
                      onBlur={(ev) => {
                        if (ev.target.value !== e.rawResult) {
                          void patchExperience(e.id, { rawResult: ev.target.value });
                        }
                      }}
                    />
                  </MetierField>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
