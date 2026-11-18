"use client";

import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import { TuesdayLoader } from "@/components/brand";
import V2PageHeader from "../../v2/V2PageHeader";
import MetierEmptyState from "../metier/MetierEmptyState";
import StatusPill from "../metier/StatusPill";
import { useGdpSpace } from "../../../lib/useGdpSpace";
import {
  GDP_HEALTH_OPTIONS,
  GDP_PRIORITY_OPTIONS,
  GDP_STATUS_OPTIONS,
  labelForOption,
} from "../../../lib/gdpTypes";

function healthTone(h: string) {
  if (h === "vert") return "vert";
  if (h === "orange") return "orange";
  return "rouge";
}

export default function GdpHomePage() {
  const { projects, milestones, risks, loading } = useGdpSpace();

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <TuesdayLoader />
      </div>
    );
  }

  const active = projects.filter((p) => p.status === "actif" || p.status === "qualification");
  const openRisks = risks.filter((r) => r.status === "ouvert" || r.status === "en_mitigation");
  const upcoming = milestones
    .filter((m) => m.status === "a_venir" || m.status === "decale")
    .slice(0, 5);

  return (
    <div className="space-y-5">
      <V2PageHeader
        kicker="Gestion de Projet"
        title="Portfolio"
        description="Cockpit PMO : santé, priorités et jalons — le projet est l’enveloppe, pas une carte Kanban."
        icon={FolderKanban}
        aside={
          <Link href="/v3/gdp/projets?new=1" className="ui-btn ui-btn-primary text-xs">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Créer un projet
          </Link>
        }
      />

      {projects.length === 0 ? (
        <MetierEmptyState
          icon={FolderKanban}
          title="Portfolio vide"
          description="Créez un projet PMO avec objectif, santé et jalons — distinct de Communication."
          actionLabel="Créer un projet"
          onAction={() => {
            window.location.href = "/v3/gdp/projets?new=1";
          }}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="ui-surface rounded-2xl px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--foreground)]/40">
                Projets actifs
              </p>
              <p className="mt-1 text-2xl font-semibold">{active.length}</p>
            </div>
            <div className="ui-surface rounded-2xl px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--foreground)]/40">
                Jalons à venir
              </p>
              <p className="mt-1 text-2xl font-semibold">{upcoming.length}</p>
            </div>
            <div className="ui-surface rounded-2xl px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--foreground)]/40">
                Risques ouverts
              </p>
              <p className="mt-1 text-2xl font-semibold">{openRisks.length}</p>
            </div>
          </div>

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Projets</h2>
              <Link href="/v3/gdp/projets" className="text-xs text-[var(--accent)] hover:underline">
                Liste complète
              </Link>
            </div>
            <div className="overflow-hidden rounded-2xl border border-[var(--line)]">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--surface-soft)] text-[11px] uppercase tracking-[0.08em] text-[color:var(--foreground)]/45">
                  <tr>
                    <th className="px-3 py-2 font-medium">Projet</th>
                    <th className="px-3 py-2 font-medium">Statut</th>
                    <th className="px-3 py-2 font-medium">Santé</th>
                    <th className="px-3 py-2 font-medium">Priorité</th>
                    <th className="px-3 py-2 font-medium">Avancement</th>
                    <th className="px-3 py-2 font-medium">Fin cible</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.slice(0, 10).map((p) => (
                    <tr key={p.id} className="border-t border-[var(--line)]/70">
                      <td className="px-3 py-2.5">
                        <Link href={`/v3/gdp/projets/${p.id}`} className="font-medium hover:text-[var(--accent)]">
                          {p.code ? `${p.code} · ` : ""}
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusPill label={labelForOption(GDP_STATUS_OPTIONS, p.status)} />
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusPill
                          label={labelForOption(GDP_HEALTH_OPTIONS, p.health)}
                          tone={healthTone(p.health)}
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        {labelForOption(GDP_PRIORITY_OPTIONS, p.portfolioPriority)}
                      </td>
                      <td className="px-3 py-2.5">{p.progressPct}%</td>
                      <td className="px-3 py-2.5 text-[color:var(--foreground)]/60">
                        {p.targetEndDate ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
