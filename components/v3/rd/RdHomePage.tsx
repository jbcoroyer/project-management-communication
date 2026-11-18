"use client";

import Link from "next/link";
import { Beaker, FlaskConical, Plus, Scale } from "lucide-react";
import { TuesdayLoader } from "@/components/brand";
import V2PageHeader from "../../v2/V2PageHeader";
import MetierEmptyState from "../metier/MetierEmptyState";
import StatusPill from "../metier/StatusPill";
import { useRdSpace } from "../../../lib/useRdSpace";
import { labelForOption, RD_PHASE_OPTIONS, RD_RISK_OPTIONS } from "../../../lib/rdTypes";

export default function RdHomePage() {
  const { projects, experiences, gates, loading } = useRdSpace();

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <TuesdayLoader />
      </div>
    );
  }

  const upcomingGates = gates
    .filter((g) => g.status !== "decidee" && g.status !== "suivi_actions")
    .slice(0, 5);
  const openExperiences = experiences.filter((e) => e.status !== "cloturee");
  const activeProjects = projects.filter((p) => p.status === "actif");

  return (
    <div className="space-y-5">
      <V2PageHeader
        kicker="R&D"
        title="Portfolio recherche"
        description="Réduire l’incertitude : projets, expériences et gates — pas un Kanban de livraison."
        icon={FlaskConical}
        aside={
          <Link href="/v3/rd/projets" className="ui-btn ui-btn-primary text-xs">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Ouvrir un projet
          </Link>
        }
      />

      {projects.length === 0 ? (
        <MetierEmptyState
          icon={FlaskConical}
          title="Aucun projet R&D"
          description="Créez une initiative pour suivre maturité, expériences et décisions de gate."
          actionLabel="Créer un projet"
          onAction={() => {
            window.location.href = "/v3/rd/projets?new=1";
          }}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="ui-surface rounded-2xl px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--foreground)]/40">
                Projets actifs
              </p>
              <p className="mt-1 text-2xl font-semibold">{activeProjects.length}</p>
            </div>
            <div className="ui-surface rounded-2xl px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--foreground)]/40">
                Expériences ouvertes
              </p>
              <p className="mt-1 text-2xl font-semibold">{openExperiences.length}</p>
            </div>
            <div className="ui-surface rounded-2xl px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.1em] text-[color:var(--foreground)]/40">
                Gates à venir
              </p>
              <p className="mt-1 text-2xl font-semibold">{upcomingGates.length}</p>
            </div>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Projets par phase</h2>
              <Link href="/v3/rd/projets" className="text-xs text-[var(--accent)] hover:underline">
                Tout voir
              </Link>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {activeProjects.slice(0, 6).map((p) => (
                <Link
                  key={p.id}
                  href={`/v3/rd/projets/${p.id}`}
                  className="ui-surface ui-transition rounded-xl px-4 py-3 hover:ring-1 hover:ring-[var(--accent)]/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--foreground)]">{p.name}</p>
                      <p className="mt-0.5 line-clamp-2 text-[12px] text-[color:var(--foreground)]/50">
                        {p.outcome || "Outcome non renseigné"}
                      </p>
                    </div>
                    <StatusPill
                      label={labelForOption(RD_PHASE_OPTIONS, p.phase)}
                      tone="accent"
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <StatusPill
                      label={labelForOption(RD_RISK_OPTIONS, p.risk)}
                      tone={p.risk === "eleve" ? "rouge" : p.risk === "moyen" ? "orange" : "vert"}
                    />
                    <StatusPill label={p.horizon} tone="neutre" />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="ui-surface rounded-2xl p-4">
              <div className="mb-3 flex items-center gap-2">
                <Scale className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                <h2 className="text-sm font-semibold">Gates à préparer</h2>
              </div>
              {upcomingGates.length === 0 ? (
                <p className="text-sm text-[color:var(--foreground)]/50">
                  Aucune gate planifiée.{" "}
                  <Link href="/v3/rd/gates" className="text-[var(--accent)] hover:underline">
                    Programmer une gate
                  </Link>
                </p>
              ) : (
                <ul className="space-y-2">
                  {upcomingGates.map((g) => {
                    const project = projects.find((p) => p.id === g.projectId);
                    return (
                      <li key={g.id} className="rounded-lg bg-[var(--surface-soft)] px-3 py-2">
                        <p className="text-sm font-medium">{g.name}</p>
                        <p className="text-[11px] text-[color:var(--foreground)]/50">
                          {project?.name ?? "Projet"} · {g.reviewDate ?? "Date à fixer"}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="ui-surface rounded-2xl p-4">
              <div className="mb-3 flex items-center gap-2">
                <Beaker className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                <h2 className="text-sm font-semibold">Preuves en cours</h2>
              </div>
              {openExperiences.length === 0 ? (
                <p className="text-sm text-[color:var(--foreground)]/50">
                  Aucune expérience ouverte.{" "}
                  <Link href="/v3/rd/experiences" className="text-[var(--accent)] hover:underline">
                    Planifier une expérience
                  </Link>
                </p>
              ) : (
                <ul className="space-y-2">
                  {openExperiences.slice(0, 5).map((e) => (
                    <li key={e.id} className="rounded-lg bg-[var(--surface-soft)] px-3 py-2">
                      <p className="text-sm font-medium">{e.title}</p>
                      <p className="line-clamp-1 text-[11px] text-[color:var(--foreground)]/50">
                        {e.hypothesis || "Hypothèse à préciser"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
