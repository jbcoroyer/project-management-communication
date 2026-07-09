"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronRight, ClipboardList } from "lucide-react";
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
          Sélectionnez un questionnaire pour ouvrir le formulaire, modifier les questions ou
          consulter les réponses.
        </p>
      </header>

      {surveyRegistry.length === 0 ? (
        <div className="ui-surface rounded-2xl p-8 text-center text-sm text-[color:var(--foreground)]/55">
          Aucun questionnaire configuré pour le moment.
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--foreground)]/45">
            {surveyRegistry.length} questionnaire{surveyRegistry.length !== 1 ? "s" : ""} disponible
            {surveyRegistry.length !== 1 ? "s" : ""}
          </p>
          {surveyRegistry.map((survey) => {
            const responseCount = counts[survey.version] ?? 0;
            return (
              <Link
                key={survey.id}
                href={`/questionnaire/reponses/${survey.id}`}
                className="ui-surface ui-transition group flex items-center gap-4 rounded-2xl border border-[var(--line)] p-5 hover:border-[var(--accent)] hover:shadow-[var(--shadow-1)]"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)]">
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
                  <p className="mt-1 text-sm text-[color:var(--foreground)]/60">{survey.description}</p>
                  <p className="mt-2 text-xs text-[color:var(--foreground)]/45">
                    Créé le {formatDate(survey.createdAt)} · version {survey.version}
                    {loading ? "" : ` · ${responseCount} réponse${responseCount !== 1 ? "s" : ""}`}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-[color:var(--foreground)]/30 group-hover:text-[var(--accent)]" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
