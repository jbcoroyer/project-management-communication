"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  BarChart3,
  ClipboardList,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { surveyRegistry } from "../../../lib/survey/surveyRegistry";
import { getSupabaseBrowser } from "../../../lib/supabaseBrowser";

function formatDate(iso: string): string {
  try {
    return format(new Date(iso), "d MMM yyyy", { locale: fr });
  } catch {
    return iso;
  }
}

export default function SurveyListWorkspace() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const loadCounts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("survey_responses")
        .select("survey_version");
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const row of data ?? []) {
        const version = String((row as { survey_version?: string }).survey_version ?? "");
        if (!version) continue;
        map[version] = (map[version] ?? 0) + 1;
      }
      setCounts(map);
    } catch {
      setCounts({});
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadCounts().catch(() => {});
  }, [loadCounts]);

  return (
    <div className="space-y-5">
      <header className="ui-surface rounded-2xl p-5">
        <p className="ui-kicker mb-1">Service Communication</p>
        <h1 className="ui-display text-2xl text-[var(--foreground)]">Questionnaires</h1>
        <p className="mt-1 text-sm text-[color:var(--foreground)]/60">
          Gérez vos questionnaires : ouvrir le formulaire, modifier les questions ou consulter les
          réponses.
        </p>
      </header>

      <div className="grid gap-4">
        {surveyRegistry.map((survey) => {
          const responseCount = counts[survey.version] ?? 0;
          return (
            <article
              key={survey.id}
              className="ui-surface flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-[var(--foreground)]">
                      {survey.title}
                    </h2>
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        survey.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-[var(--surface-soft)] text-[color:var(--foreground)]/55",
                      ].join(" ")}
                    >
                      {survey.status === "active" ? "Actif" : "Brouillon"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[color:var(--foreground)]/60">
                    {survey.description}
                  </p>
                  <p className="mt-2 text-xs text-[color:var(--foreground)]/45">
                    Créé le {formatDate(survey.createdAt)} · version {survey.version}
                    {loading ? "" : ` · ${responseCount} réponse${responseCount !== 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:shrink-0">
                <a
                  href={survey.publicPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ui-btn ui-btn-secondary gap-2 text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ouvrir
                </a>
                <Link
                  href={`/questionnaire/reponses/${survey.id}/edit`}
                  className="ui-btn ui-btn-secondary gap-2 text-xs"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Éditer
                </Link>
                <Link
                  href={`/questionnaire/reponses/${survey.id}`}
                  className="ui-btn ui-btn-primary gap-2 text-xs"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Voir les réponses
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
