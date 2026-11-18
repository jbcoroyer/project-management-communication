"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Milestone } from "lucide-react";
import { TuesdayLoader } from "@/components/brand";
import StatusPill from "../metier/StatusPill";
import {
  MetierField,
  metierInputClass,
  metierSelectClass,
  metierTextareaClass,
} from "../metier/MetierField";
import { useGdpSpace } from "../../../lib/useGdpSpace";
import {
  GDP_HEALTH_OPTIONS,
  GDP_MILESTONE_STATUS_OPTIONS,
  GDP_PRIORITY_OPTIONS,
  GDP_STATUS_OPTIONS,
  GDP_TYPOLOGY_OPTIONS,
  labelForOption,
  type GdpHealth,
  type GdpMilestoneStatus,
  type GdpPriority,
  type GdpStatus,
  type GdpTypology,
} from "../../../lib/gdpTypes";

function healthTone(h: string) {
  if (h === "vert") return "vert";
  if (h === "orange") return "orange";
  return "rouge";
}

export default function GdpProjectDetailPage({ projectId }: { projectId: string }) {
  const { projects, milestones, risks, decisions, loading, patchProject, addMilestone } =
    useGdpSpace();
  const project = projects.find((p) => p.id === projectId);
  const [milestoneName, setMilestoneName] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");
  const [tab, setTab] = useState<"apercu" | "jalons" | "risques" | "decisions">("apercu");

  const linkedMilestones = useMemo(
    () => milestones.filter((m) => m.projectId === projectId),
    [milestones, projectId],
  );
  const linkedRisks = useMemo(
    () => risks.filter((r) => r.projectId === projectId),
    [risks, projectId],
  );
  const linkedDecisions = useMemo(
    () => decisions.filter((d) => d.projectId === projectId),
    [decisions, projectId],
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
        <Link href="/v3/gdp/projets" className="inline-flex items-center gap-1 text-sm text-[var(--accent)]">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        <p className="text-sm text-[color:var(--foreground)]/55">Projet introuvable.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link href="/v3/gdp/projets" className="inline-flex items-center gap-1 text-sm text-[var(--accent)]">
        <ArrowLeft className="h-4 w-4" /> Projets
      </Link>

      <header className="ui-surface rounded-2xl border-l-4 border-l-[var(--accent)] px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
          Fiche projet
        </p>
        <h1 className="ui-heading mt-1 text-2xl font-semibold">
          {project.code ? `${project.code} · ` : ""}
          {project.name}
        </h1>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <StatusPill label={labelForOption(GDP_STATUS_OPTIONS, project.status)} />
          <StatusPill
            label={labelForOption(GDP_HEALTH_OPTIONS, project.health)}
            tone={healthTone(project.health)}
          />
          <StatusPill label={labelForOption(GDP_TYPOLOGY_OPTIONS, project.typology)} tone="accent" />
          <StatusPill label={`${project.progressPct}%`} />
        </div>
      </header>

      <div className="flex flex-wrap gap-1 border-b border-[var(--line)]/70 pb-2">
        {(
          [
            ["apercu", "Aperçu"],
            ["jalons", "Jalons"],
            ["risques", "Risques"],
            ["decisions", "Décisions"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={[
              "rounded-lg px-3 py-1.5 text-xs font-medium",
              tab === id
                ? "bg-[var(--surface)] text-[var(--foreground)] ring-1 ring-[var(--line)]"
                : "text-[color:var(--foreground)]/55 hover:bg-[var(--surface-soft)]",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "apercu" ? (
        <div className="ui-surface grid gap-3 rounded-2xl p-4 md:grid-cols-2">
          <MetierField label="Nom">
            <input
              className={metierInputClass}
              defaultValue={project.name}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value !== project.name) {
                  void patchProject(project.id, { name: e.target.value });
                }
              }}
            />
          </MetierField>
          <MetierField label="Code">
            <input
              className={metierInputClass}
              defaultValue={project.code ?? ""}
              onBlur={(e) => {
                if ((e.target.value || null) !== project.code) {
                  void patchProject(project.id, { code: e.target.value || null });
                }
              }}
            />
          </MetierField>
          <MetierField label="Statut">
            <select
              className={metierSelectClass}
              value={project.status}
              onChange={(e) => void patchProject(project.id, { status: e.target.value as GdpStatus })}
            >
              {GDP_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </MetierField>
          <MetierField label="Santé">
            <select
              className={metierSelectClass}
              value={project.health}
              onChange={(e) => void patchProject(project.id, { health: e.target.value as GdpHealth })}
            >
              {GDP_HEALTH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </MetierField>
          <MetierField label="Typologie">
            <select
              className={metierSelectClass}
              value={project.typology}
              onChange={(e) =>
                void patchProject(project.id, { typology: e.target.value as GdpTypology })
              }
            >
              {GDP_TYPOLOGY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </MetierField>
          <MetierField label="Priorité">
            <select
              className={metierSelectClass}
              value={project.portfolioPriority}
              onChange={(e) =>
                void patchProject(project.id, {
                  portfolioPriority: e.target.value as GdpPriority,
                })
              }
            >
              {GDP_PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </MetierField>
          <MetierField label="Avancement %">
            <input
              type="number"
              min={0}
              max={100}
              className={metierInputClass}
              defaultValue={project.progressPct}
              onBlur={(e) => {
                const n = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                if (n !== project.progressPct) void patchProject(project.id, { progressPct: n });
              }}
            />
          </MetierField>
          <MetierField label="Fin cible">
            <input
              type="date"
              className={metierInputClass}
              defaultValue={project.targetEndDate ?? ""}
              onBlur={(e) => {
                const v = e.target.value || null;
                if (v !== project.targetEndDate) {
                  void patchProject(project.id, { targetEndDate: v });
                }
              }}
            />
          </MetierField>
          <MetierField label="Objectif" className="md:col-span-2">
            <textarea
              className={metierTextareaClass}
              defaultValue={project.objective}
              onBlur={(e) => {
                if (e.target.value !== project.objective) {
                  void patchProject(project.id, { objective: e.target.value });
                }
              }}
            />
          </MetierField>
        </div>
      ) : null}

      {tab === "jalons" ? (
        <div className="space-y-3">
          <div className="ui-surface flex flex-wrap items-end gap-2 rounded-2xl p-4">
            <MetierField label="Nouveau jalon" className="min-w-[12rem] flex-1">
              <input
                className={metierInputClass}
                value={milestoneName}
                onChange={(e) => setMilestoneName(e.target.value)}
                placeholder="Kick-off, go-live…"
              />
            </MetierField>
            <MetierField label="Date">
              <input
                type="date"
                className={metierInputClass}
                value={milestoneDate}
                onChange={(e) => setMilestoneDate(e.target.value)}
              />
            </MetierField>
            <button
              type="button"
              className="ui-btn ui-btn-primary text-xs"
              onClick={() => {
                if (!milestoneName.trim()) return;
                void addMilestone({
                  projectId: project.id,
                  name: milestoneName,
                  dueDate: milestoneDate || null,
                }).then((m) => {
                  if (m) {
                    setMilestoneName("");
                    setMilestoneDate("");
                  }
                });
              }}
            >
              Ajouter
            </button>
          </div>
          {linkedMilestones.length === 0 ? (
            <p className="text-sm text-[color:var(--foreground)]/50">Aucun jalon.</p>
          ) : (
            <ul className="space-y-2">
              {linkedMilestones.map((m) => (
                <li key={m.id} className="ui-surface flex items-center justify-between gap-2 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Milestone className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                    <div>
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-[11px] text-[color:var(--foreground)]/50">
                        {m.dueDate ?? "Sans date"}
                        {m.isCritical ? " · critique" : ""}
                      </p>
                    </div>
                  </div>
                  <StatusPill label={labelForOption(GDP_MILESTONE_STATUS_OPTIONS, m.status as GdpMilestoneStatus)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {tab === "risques" ? (
        <div className="space-y-2">
          <Link href="/v3/gdp/risques" className="text-xs text-[var(--accent)]">
            Ouvrir le registre risques →
          </Link>
          {linkedRisks.length === 0 ? (
            <p className="text-sm text-[color:var(--foreground)]/50">Aucun risque lié.</p>
          ) : (
            linkedRisks.map((r) => (
              <div key={r.id} className="ui-surface rounded-xl px-4 py-3 text-sm">
                <p className="font-medium">{r.title}</p>
                <p className="text-[11px] text-[color:var(--foreground)]/50">
                  Score {r.probability * r.impact} · {r.status}
                </p>
              </div>
            ))
          )}
        </div>
      ) : null}

      {tab === "decisions" ? (
        <div className="space-y-2">
          <Link href="/v3/gdp/decisions" className="text-xs text-[var(--accent)]">
            Ouvrir le journal des décisions →
          </Link>
          {linkedDecisions.length === 0 ? (
            <p className="text-sm text-[color:var(--foreground)]/50">Aucune décision liée.</p>
          ) : (
            linkedDecisions.map((d) => (
              <div key={d.id} className="ui-surface rounded-xl px-4 py-3 text-sm">
                <p className="font-medium">{d.title}</p>
                <p className="text-[11px] text-[color:var(--foreground)]/50">{d.decidedAt}</p>
                <p className="mt-1 text-[color:var(--foreground)]/70">{d.decision || d.context}</p>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
