"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Download, ExternalLink, Inbox, Smile, ThumbsUp, Users } from "lucide-react";
import { getQuestion, satisfaction2026 } from "../../../lib/survey/satisfaction2026";
import {
  collectVerbatims,
  computeChoiceDistributions,
  computeNps,
  computeRatingStats,
  computeSatisfactionAverage,
} from "../../../lib/survey/surveyAnalytics";
import { surveyResponsesToCsv } from "../../../lib/survey/surveyExport";
import { mapSurveyResponseRow } from "../../../lib/survey/surveyMappers";
import type { SurveyResponse } from "../../../lib/survey/surveyTypes";
import { getSupabaseBrowser } from "../../../lib/supabaseBrowser";
import { toastError, toastSuccess } from "../../../lib/toast";
import { useRealtimeReload } from "../../../lib/useRealtimeReload";
import { DistributionChart, RatingAveragesChart } from "./SurveyCharts";
import SurveyVerbatims from "./SurveyVerbatims";

type PeriodPreset = "all" | "30" | "90" | "365";

const ENTITY_OPTIONS = getQuestion("q1")?.options ?? [];
const SERVICE_OPTIONS = getQuestion("q2")?.options ?? [];
const PRESTATION_OPTIONS = getQuestion("q4")?.options ?? [];

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

export default function SurveyResponsesWorkspace() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [now] = useState(() => Date.now());
  const [entity, setEntity] = useState("all");
  const [service, setService] = useState("all");
  const [prestation, setPrestation] = useState("all");
  const [period, setPeriod] = useState<PeriodPreset>("all");

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("survey_responses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setResponses((data ?? []).map(mapSurveyResponseRow));
    } catch {
      toastError("Chargement des réponses impossible.");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void load().catch(() => {});
  }, [load]);

  useRealtimeReload({
    table: "survey_responses",
    channelName: "survey-responses-realtime",
    onChange: useCallback(() => {
      void load();
    }, [load]),
  });

  const filtered = useMemo(() => {
    const periodMs =
      period === "all" ? null : Number(period) * 24 * 60 * 60 * 1000;
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
  const ratingStats = useMemo(() => computeRatingStats(filtered), [filtered]);
  const distributions = useMemo(() => computeChoiceDistributions(filtered), [filtered]);
  const verbatims = useMemo(() => collectVerbatims(filtered), [filtered]);

  const handleExport = () => {
    if (filtered.length === 0) {
      toastError("Aucune réponse à exporter.");
      return;
    }
    const csv = surveyResponsesToCsv(filtered);
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `questionnaire-satisfaction-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toastSuccess("Export CSV généré");
  };

  const selectClass =
    "ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]";

  return (
    <div className="space-y-5">
      <header className="ui-surface flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="ui-kicker mb-1">Service Communication</p>
          <h1 className="ui-display text-2xl text-[var(--foreground)]">
            Réponses au questionnaire
          </h1>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/60">
            Questionnaire de satisfaction · version {satisfaction2026.version}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/questionnaire"
            target="_blank"
            rel="noopener noreferrer"
            className="ui-btn ui-btn-primary gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Accéder au questionnaire
          </a>
          <button type="button" onClick={handleExport} className="ui-btn ui-btn-secondary gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </header>

      {/* Filtres */}
      <div className="ui-surface flex flex-wrap items-center gap-3 rounded-2xl p-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--foreground)]/45">
          Filtres
        </span>
        <select value={entity} onChange={(e) => setEntity(e.target.value)} className={selectClass}>
          <option value="all">Toutes les entités</option>
          {ENTITY_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        <select value={service} onChange={(e) => setService(e.target.value)} className={selectClass}>
          <option value="all">Tous les services</option>
          {SERVICE_OPTIONS.map((o) => (
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
          {PRESTATION_OPTIONS.map((o) => (
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
            Aucune réponse pour le moment. Partagez le lien du questionnaire{" "}
            <span className="font-semibold">/questionnaire</span>.
          </p>
        </div>
      ) : (
        <>
          {/* KPIs */}
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

          {/* Moyennes notées */}
          <section className="ui-surface rounded-2xl p-5">
            <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <BarChart3 className="h-4 w-4 text-[color:var(--foreground)]/50" />
              Moyennes par question notée
            </h3>
            <RatingAveragesChart stats={ratingStats} />
          </section>

          {/* Répartitions des fermées */}
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
