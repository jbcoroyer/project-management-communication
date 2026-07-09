"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Download, Inbox, ListChecks, Smile, ThumbsUp, Users } from "lucide-react";
import { deleteSurveyResponse, fetchSurveyDefinition } from "../../../app/actions/survey";
import { useConfirm } from "../../ui/ConfirmDialog";
import { findQuestion } from "../../../lib/survey/surveyDefinitionUtils";
import {
  collectVerbatims,
  computeChoiceDistributions,
  computeNps,
  computeRatingStats,
  computeSatisfactionAverage,
} from "../../../lib/survey/surveyAnalytics";
import { surveyResponsesToCsv } from "../../../lib/survey/surveyExport";
import { mapSurveyResponseRow } from "../../../lib/survey/surveyMappers";
import { getDefaultSurveyDefinition } from "../../../lib/survey/surveyRegistry";
import type { SurveyDefinition, SurveyResponse } from "../../../lib/survey/surveyTypes";
import { getSupabaseBrowser } from "../../../lib/supabaseBrowser";
import { toastError, toastSuccess } from "../../../lib/toast";
import { useRealtimeReload } from "../../../lib/useRealtimeReload";
import { DistributionChart, RatingAveragesChart } from "./SurveyCharts";
import SurveyResponseList from "./SurveyResponseList";
import SurveyVerbatims from "./SurveyVerbatims";

type PeriodPreset = "all" | "30" | "90" | "365";
type ResponsesTab = "summary" | "individual";

type SurveyResponsesWorkspaceProps = {
  surveyId: string;
  title: string;
  publicPath: string;
};

function KpiCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="ui-surface flex gap-3 rounded-2xl p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--foreground)]/45">
          {label}
        </p>
        <p className="ui-heading text-2xl font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

export default function SurveyResponsesWorkspace({
  surveyId,
  title,
  publicPath,
}: SurveyResponsesWorkspaceProps) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const confirm = useConfirm();
  const [definition, setDefinition] = useState<SurveyDefinition | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ResponsesTab>("summary");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [now] = useState(() => Date.now());
  const [entity, setEntity] = useState("all");
  const [service, setService] = useState("all");
  const [prestation, setPrestation] = useState("all");
  const [period, setPeriod] = useState<PeriodPreset>("all");

  const activeDefinition = definition ?? getDefaultSurveyDefinition(surveyId) ?? null;

  const entityOptions = useMemo(
    () => activeDefinition ? findQuestion(activeDefinition, "q1")?.options ?? [] : [],
    [activeDefinition],
  );
  const serviceOptions = useMemo(
    () => activeDefinition ? findQuestion(activeDefinition, "q2")?.options ?? [] : [],
    [activeDefinition],
  );
  const prestationOptions = useMemo(
    () => activeDefinition ? findQuestion(activeDefinition, "q4")?.options ?? [] : [],
    [activeDefinition],
  );

  const load = useCallback(async () => {
    try {
      const [defResult, responsesResult] = await Promise.all([
        fetchSurveyDefinition(surveyId),
        supabase
          .from("survey_responses")
          .select("*")
          .eq("survey_version", surveyId)
          .order("created_at", { ascending: false }),
      ]);

      if (defResult.ok) setDefinition(defResult.definition);
      if (responsesResult.error) throw responsesResult.error;
      setResponses((responsesResult.data ?? []).map(mapSurveyResponseRow));
    } catch {
      toastError("Chargement des réponses impossible.");
    } finally {
      setLoading(false);
    }
  }, [supabase, surveyId]);

  useEffect(() => {
    void load().catch(() => {});
  }, [load]);

  useRealtimeReload({
    table: "survey_responses",
    channelName: `survey-responses-${surveyId}`,
    onChange: useCallback(() => {
      void load();
    }, [load]),
  });

  const filtered = useMemo(() => {
    const periodMs = period === "all" ? null : Number(period) * 24 * 60 * 60 * 1000;
    return responses.filter((r) => {
      if (entity !== "all" && r.entity !== entity) return false;
      if (service !== "all" && r.service !== service) return false;
      if (prestation !== "all" && !r.prestations.includes(prestation)) return false;
      if (periodMs != null && r.createdAt) {
        if (new Date(r.createdAt).getTime() < now - periodMs) return false;
      }
      return true;
    });
  }, [responses, entity, service, prestation, period, now]);

  const nps = useMemo(() => computeNps(filtered), [filtered]);
  const satisfactionAvg = useMemo(() => computeSatisfactionAverage(filtered), [filtered]);
  const ratingStats = useMemo(
    () => (activeDefinition ? computeRatingStats(filtered, activeDefinition) : []),
    [filtered, activeDefinition],
  );
  const distributions = useMemo(
    () => (activeDefinition ? computeChoiceDistributions(filtered, activeDefinition) : []),
    [filtered, activeDefinition],
  );
  const verbatims = useMemo(
    () => (activeDefinition ? collectVerbatims(filtered, activeDefinition) : []),
    [filtered, activeDefinition],
  );

  const handleExport = () => {
    if (!activeDefinition || filtered.length === 0) {
      toastError("Aucune réponse à exporter.");
      return;
    }
    const csv = surveyResponsesToCsv(filtered, activeDefinition);
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `questionnaire-${surveyId}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toastSuccess("Export CSV généré");
  };

  const handleDelete = async (responseId: string) => {
    const ok = await confirm({
      title: "Supprimer cette réponse ?",
      description: "La réponse sera définitivement supprimée. Cette action est irréversible.",
      confirmLabel: "Supprimer",
      variant: "destructive",
    });
    if (!ok) return;

    setDeletingId(responseId);
    const result = await deleteSurveyResponse(surveyId, responseId);
    setDeletingId(null);
    if (!result.ok) {
      toastError(result.error);
      return;
    }
    setResponses((prev) => prev.filter((r) => r.id !== responseId));
    toastSuccess("Réponse supprimée");
  };

  const selectClass =
    "ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]";

  return (
    <div className="space-y-5">
      <header className="ui-surface flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <Link
            href={`/questionnaire/reponses/${surveyId}`}
            className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-[color:var(--foreground)]/50 hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour au questionnaire
          </Link>
          <p className="ui-kicker mb-1">Service Communication</p>
          <h1 className="ui-display text-2xl text-[var(--foreground)]">Réponses</h1>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/60">{title}</p>
        </div>
        <button type="button" onClick={handleExport} className="ui-btn ui-btn-secondary gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </header>

      <div className="inline-flex rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1">
        {([
          { id: "summary", label: "Synthèse", icon: BarChart3 },
          { id: "individual", label: "Réponses individuelles", icon: ListChecks },
        ] as const).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition",
                tab === t.id
                  ? "bg-[var(--foreground)] text-[var(--accent-contrast)]"
                  : "text-[color:var(--foreground)]/65 hover:bg-[var(--surface-soft)]",
              ].join(" ")}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="ui-surface flex flex-wrap items-center gap-3 rounded-2xl p-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--foreground)]/45">
          Filtres
        </span>
        <select value={entity} onChange={(e) => setEntity(e.target.value)} className={selectClass}>
          <option value="all">Toutes les entités</option>
          {entityOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <select value={service} onChange={(e) => setService(e.target.value)} className={selectClass}>
          <option value="all">Tous les services</option>
          {serviceOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <select
          value={prestation}
          onChange={(e) => setPrestation(e.target.value)}
          className={selectClass}
        >
          <option value="all">Toutes les prestations</option>
          {prestationOptions.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as PeriodPreset)}
          className={selectClass}
        >
          <option value="all">Toute la période</option>
          <option value="30">30 derniers jours</option>
          <option value="90">90 derniers jours</option>
          <option value="365">12 derniers mois</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-[color:var(--foreground)]/55">Chargement des réponses…</p>
      ) : responses.length === 0 ? (
        <div className="ui-surface flex flex-col items-center gap-2 rounded-2xl p-12 text-center">
          <Inbox className="h-8 w-8 text-[color:var(--foreground)]/35" />
          <p className="text-sm text-[color:var(--foreground)]/55">
            Aucune réponse pour le moment. Partagez le lien{" "}
            <a
              href={publicPath}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
            >
              {publicPath}
            </a>
            .
          </p>
        </div>
      ) : tab === "individual" && activeDefinition ? (
        <SurveyResponseList
          definition={activeDefinition}
          responses={filtered}
          onDelete={(id) => void handleDelete(id)}
          deletingId={deletingId}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={Users}
              label="Réponses"
              value={String(filtered.length)}
              accent="bg-[var(--surface-soft)] text-[color:var(--foreground)]/75"
            />
            <KpiCard
              icon={Smile}
              label="Satisfaction moy. (/10)"
              value={satisfactionAvg != null ? satisfactionAvg.toFixed(1) : "—"}
              accent="bg-emerald-50 text-emerald-700"
            />
            <KpiCard
              icon={ThumbsUp}
              label="NPS"
              value={nps.score != null ? String(nps.score) : "—"}
              accent="bg-violet-50 text-violet-700"
            />
            <KpiCard
              icon={BarChart3}
              label="Promoteurs / Détracteurs"
              value={`${nps.promoters} / ${nps.detractors}`}
              accent="bg-amber-50 text-amber-800"
            />
          </div>

          <section className="ui-surface rounded-2xl p-5">
            <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <BarChart3 className="h-4 w-4 text-[color:var(--foreground)]/50" />
              Moyennes par question notée
            </h3>
            <RatingAveragesChart stats={ratingStats} />
          </section>

          <div className="grid gap-5 xl:grid-cols-2">
            {distributions.map((dist) => (
              <section key={dist.questionId} className="ui-surface rounded-2xl p-5">
                <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">{dist.label}</h3>
                <DistributionChart distribution={dist} />
              </section>
            ))}
          </div>

          <SurveyVerbatims verbatims={verbatims} />
        </>
      )}
    </div>
  );
}
