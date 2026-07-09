"use client";

import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { getSurveyRegistryEntry } from "../../../lib/survey/surveyRegistry";

function formatDate(iso: string): string {
  try {
    return format(new Date(iso), "d MMM yyyy", { locale: fr });
  } catch {
    return iso;
  }
}

type SurveyHubWorkspaceProps = {
  surveyId: string;
  responseCount: number;
};

export default function SurveyHubWorkspace({ surveyId, responseCount }: SurveyHubWorkspaceProps) {
  const survey = getSurveyRegistryEntry(surveyId);
  if (!survey) {
    return <p className="text-sm text-[color:var(--foreground)]/55">Questionnaire introuvable.</p>;
  }

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${survey.publicPath}`
      : survey.publicPath;

  const actions = [
    {
      title: "Ouvrir le formulaire",
      description: "Consulter ou partager le lien public du questionnaire.",
      href: survey.publicPath,
      external: true,
      icon: ExternalLink,
      className: "ui-btn-secondary",
    },
    {
      title: "Éditer les questions",
      description: "Modifier les intitulés, options et textes du questionnaire.",
      href: `/questionnaire/reponses/${survey.id}/edit`,
      external: false,
      icon: Pencil,
      className: "ui-btn-secondary",
    },
    {
      title: "Voir les réponses",
      description: "Consulter les statistiques, graphiques et verbatims.",
      href: `/questionnaire/reponses/${survey.id}/reponses`,
      external: false,
      icon: BarChart3,
      className: "ui-btn-primary",
    },
  ] as const;

  return (
    <div className="space-y-5">
      <header className="ui-surface rounded-2xl p-5">
        <Link
          href="/questionnaire/reponses"
          className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--foreground)]/50 hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à la liste
        </Link>
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
            <ClipboardList className="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="ui-display text-2xl text-[var(--foreground)]">{survey.title}</h1>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                {survey.status === "active" ? "Actif" : "Brouillon"}
              </span>
            </div>
            <p className="mt-1 text-sm text-[color:var(--foreground)]/60">{survey.description}</p>
            <p className="mt-2 text-xs text-[color:var(--foreground)]/45">
              Créé le {formatDate(survey.createdAt)} · version {survey.version} · {responseCount}{" "}
              réponse{responseCount !== 1 ? "s" : ""}
            </p>
            <p className="mt-1 text-xs text-[color:var(--foreground)]/45">
              Lien public :{" "}
              <span className="font-mono text-[color:var(--foreground)]/70">{publicUrl}</span>
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          const content = (
            <div className="ui-surface ui-transition flex h-full flex-col gap-3 rounded-2xl p-5 hover:border-[var(--line-strong)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-[var(--accent)]">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-[var(--foreground)]">{action.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-[color:var(--foreground)]/60">
                  {action.description}
                </p>
              </div>
              <span className={`ui-btn w-full justify-center gap-2 text-xs ${action.className}`}>
                Choisir
                <Icon className="h-3.5 w-3.5" />
              </span>
            </div>
          );

          if (action.external) {
            return (
              <a
                key={action.title}
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block h-full"
              >
                {content}
              </a>
            );
          }

          return (
            <Link key={action.title} href={action.href} className="block h-full">
              {content}
            </Link>
          );
        })}
      </section>
    </div>
  );
}
