"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FolderKanban, Plus } from "lucide-react";
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
  GDP_HEALTH_OPTIONS,
  GDP_PRIORITY_OPTIONS,
  GDP_STATUS_OPTIONS,
  GDP_TYPOLOGY_OPTIONS,
  labelForOption,
  type GdpHealth,
  type GdpPriority,
  type GdpStatus,
  type GdpTypology,
} from "../../../lib/gdpTypes";

function healthTone(h: string) {
  if (h === "vert") return "vert";
  if (h === "orange") return "orange";
  return "rouge";
}

export default function GdpProjectsPage() {
  const search = useSearchParams();
  const { projects, loading, addProject } = useGdpSpace();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [objective, setObjective] = useState("");
  const [status, setStatus] = useState<GdpStatus>("brouillon");
  const [health, setHealth] = useState<GdpHealth>("vert");
  const [typology, setTypology] = useState<GdpTypology>("autre");
  const [priority, setPriority] = useState<GdpPriority>("moyenne");
  const [targetEndDate, setTargetEndDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (search.get("new") === "1") setOpen(true);
  }, [search]);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const created = await addProject({
      name,
      code: code || null,
      objective,
      status,
      health,
      typology,
      portfolioPriority: priority,
      targetEndDate: targetEndDate || null,
    });
    setSaving(false);
    if (created) {
      setOpen(false);
      setName("");
      setCode("");
      setObjective("");
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
        title="Projets"
        description="Enveloppes PMO avec statut, santé, typologie et objectif — pas des cartes Kanban."
        icon={FolderKanban}
        aside={
          <button type="button" className="ui-btn ui-btn-primary text-xs" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Nouveau projet
          </button>
        }
      />

      {open ? (
        <div className="ui-surface space-y-3 rounded-2xl p-4">
          <h2 className="text-sm font-semibold">Créer un projet</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <MetierField label="Nom">
              <input className={metierInputClass} value={name} onChange={(e) => setName(e.target.value)} />
            </MetierField>
            <MetierField label="Code">
              <input className={metierInputClass} value={code} onChange={(e) => setCode(e.target.value)} placeholder="PRJ-2026-014" />
            </MetierField>
            <MetierField label="Statut">
              <select className={metierSelectClass} value={status} onChange={(e) => setStatus(e.target.value as GdpStatus)}>
                {GDP_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </MetierField>
            <MetierField label="Santé">
              <select className={metierSelectClass} value={health} onChange={(e) => setHealth(e.target.value as GdpHealth)}>
                {GDP_HEALTH_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </MetierField>
            <MetierField label="Typologie">
              <select className={metierSelectClass} value={typology} onChange={(e) => setTypology(e.target.value as GdpTypology)}>
                {GDP_TYPOLOGY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </MetierField>
            <MetierField label="Priorité portfolio">
              <select className={metierSelectClass} value={priority} onChange={(e) => setPriority(e.target.value as GdpPriority)}>
                {GDP_PRIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </MetierField>
            <MetierField label="Fin cible">
              <input type="date" className={metierInputClass} value={targetEndDate} onChange={(e) => setTargetEndDate(e.target.value)} />
            </MetierField>
            <MetierField label="Objectif" className="md:col-span-2">
              <textarea className={metierTextareaClass} value={objective} onChange={(e) => setObjective(e.target.value)} />
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
          icon={FolderKanban}
          title="Aucun projet"
          description="Le portfolio PMO commence par un projet avec objectif et santé."
          actionLabel="Créer un projet"
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="space-y-2">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/v3/gdp/projets/${p.id}`}
              className="ui-surface flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 hover:ring-1 hover:ring-[var(--accent)]/25"
            >
              <div className="min-w-0">
                <p className="font-medium">
                  {p.code ? <span className="text-[color:var(--foreground)]/45">{p.code} · </span> : null}
                  {p.name}
                </p>
                <p className="mt-0.5 line-clamp-1 text-[12px] text-[color:var(--foreground)]/50">
                  {p.objective || "Objectif non renseigné"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusPill label={labelForOption(GDP_STATUS_OPTIONS, p.status)} />
                <StatusPill label={labelForOption(GDP_HEALTH_OPTIONS, p.health)} tone={healthTone(p.health)} />
                <StatusPill label={`${p.progressPct}%`} tone="accent" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
