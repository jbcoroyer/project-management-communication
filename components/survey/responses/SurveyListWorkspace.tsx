"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Building2,
  ChevronRight,
  ExternalLink,
  Layers,
  MessageSquare,
  Plus,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  createSurvey,
  listSurveys,
  type SurveyAudience,
  type SurveyListItem,
} from "../../../app/actions/survey";
import { toastError, toastSuccess } from "../../../lib/toast";

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "d MMM yyyy", { locale: fr });
  } catch {
    return iso;
  }
}

const AUDIENCE_THEMES: Record<
  SurveyAudience,
  {
    label: string;
    subtitle: string;
    icon: typeof Users;
    border: string;
    iconBg: string;
    iconColor: string;
    badge: string;
    accent: string;
    cardHover: string;
  }
> = {
  externe: {
    label: "Collaborateurs groupe",
    subtitle: "Diffusé à l'échelle de l'entreprise",
    icon: Users,
    border: "border-l-sky-500",
    iconBg: "bg-gradient-to-br from-sky-100 to-sky-50",
    iconColor: "text-sky-700",
    badge: "bg-sky-100 text-sky-800 ring-sky-200",
    accent: "group-hover:text-sky-700",
    cardHover: "hover:border-sky-300 hover:shadow-[0_8px_30px_-12px_rgba(14,165,233,0.35)]",
  },
  interne: {
    label: "Équipe Communication",
    subtitle: "Réservé aux membres du service",
    icon: Building2,
    border: "border-l-violet-500",
    iconBg: "bg-gradient-to-br from-violet-100 to-fuchsia-50",
    iconColor: "text-violet-700",
    badge: "bg-violet-100 text-violet-800 ring-violet-200",
    accent: "group-hover:text-violet-700",
    cardHover: "hover:border-violet-300 hover:shadow-[0_8px_30px_-12px_rgba(139,92,246,0.35)]",
  },
  general: {
    label: "Personnalisé",
    subtitle: "Questionnaire sur mesure",
    icon: Sparkles,
    border: "border-l-amber-500",
    iconBg: "bg-gradient-to-br from-amber-100 to-orange-50",
    iconColor: "text-amber-800",
    badge: "bg-amber-100 text-amber-900 ring-amber-200",
    accent: "group-hover:text-amber-800",
    cardHover: "hover:border-amber-300 hover:shadow-[0_8px_30px_-12px_rgba(245,158,11,0.3)]",
  },
};

function SurveyCard({ survey }: { survey: SurveyListItem }) {
  const theme = AUDIENCE_THEMES[survey.audience];
  const Icon = theme.icon;

  return (
    <Link
      href={`/questionnaire/reponses/${survey.id}`}
      className={[
        "ui-surface ui-transition group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] border-l-4 p-5",
        theme.border,
        theme.cardHover,
      ].join(" ")}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div
          className={[
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-black/5",
            theme.iconBg,
            theme.iconColor,
          ].join(" ")}
        >
          <Icon className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <span
            className={[
              "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
              theme.badge,
            ].join(" ")}
          >
            {theme.label}
          </span>
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
      </div>

      <h2
        className={[
          "text-lg font-semibold leading-snug text-[var(--foreground)] transition-colors",
          theme.accent,
        ].join(" ")}
      >
        {survey.title}
      </h2>
      <p className="mt-1 text-xs font-medium text-[color:var(--foreground)]/45">{theme.subtitle}</p>

      {survey.description ? (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[color:var(--foreground)]/60">
          {survey.description}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--surface-soft)] px-2 py-1 text-[11px] font-semibold text-[color:var(--foreground)]/60">
          <MessageSquare className="h-3 w-3" />
          {survey.questionCount} question{survey.questionCount !== 1 ? "s" : ""}
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--surface-soft)] px-2 py-1 text-[11px] font-semibold text-[color:var(--foreground)]/60">
          <Layers className="h-3 w-3" />
          {survey.stepCount} écran{survey.stepCount !== 1 ? "s" : ""}
        </span>
        <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--surface-soft)] px-2 py-1 text-[11px] font-semibold text-[color:var(--foreground)]/60">
          <Users className="h-3 w-3" />
          {survey.responseCount} réponse{survey.responseCount !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-3">
        <p className="min-w-0 truncate text-[11px] text-[color:var(--foreground)]/45">
          Créé le {formatDate(survey.createdAt)}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[color:var(--foreground)]/50">
            <ExternalLink className="h-3 w-3" />
            <span className="max-w-[120px] truncate font-mono">{survey.publicPath}</span>
          </span>
          <ChevronRight className="h-4 w-4 text-[color:var(--foreground)]/30 transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
        </div>
      </div>
    </Link>
  );
}

export default function SurveyListWorkspace() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listSurveys();
      setSurveys(data);
    } catch {
      setSurveys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async () => {
    const title = newTitle.trim();
    if (!title) {
      toastError("Merci de saisir un titre.");
      return;
    }
    setSubmitting(true);
    const result = await createSurvey(title);
    setSubmitting(false);
    if (!result.ok) {
      toastError(result.error);
      return;
    }
    toastSuccess("Questionnaire créé.");
    router.push(`/questionnaire/reponses/${result.surveyId}`);
  };

  return (
    <div className="space-y-5">
      <header className="ui-surface flex flex-wrap items-start justify-between gap-4 rounded-2xl p-5">
        <div>
          <p className="ui-kicker mb-1">Service Communication</p>
          <h1 className="ui-display text-2xl text-[var(--foreground)]">Questionnaires</h1>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/60">
            Chaque carte est codée par couleur selon son public cible : collaborateurs du groupe,
            équipe interne, ou questionnaire personnalisé.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreatingOpen((v) => !v)}
          className="ui-btn ui-btn-primary gap-2"
        >
          {creatingOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {creatingOpen ? "Annuler" : "Nouveau questionnaire"}
        </button>
      </header>

      {creatingOpen ? (
        <div className="ui-surface space-y-3 rounded-2xl p-5">
          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/55">
            Titre du nouveau questionnaire
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
              }}
              placeholder="Ex. Questionnaire d'étonnement 2026"
              className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={submitting}
              className="ui-btn ui-btn-primary gap-2"
            >
              <Plus className="h-4 w-4" />
              {submitting ? "Création…" : "Créer et configurer"}
            </button>
          </div>
        </div>
      ) : null}

      {!loading && surveys.length > 0 ? (
        <div className="flex flex-wrap gap-3">
          {(["externe", "interne", "general"] as const).map((audience) => {
            const theme = AUDIENCE_THEMES[audience];
            if (!surveys.some((s) => s.audience === audience)) return null;
            return (
              <span
                key={audience}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset",
                  theme.badge,
                ].join(" ")}
              >
                <theme.icon className="h-3 w-3" />
                {theme.label}
              </span>
            );
          })}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-[color:var(--foreground)]/55">Chargement des questionnaires…</p>
      ) : surveys.length === 0 ? (
        <div className="ui-surface rounded-2xl p-8 text-center text-sm text-[color:var(--foreground)]/55">
          Aucun questionnaire pour le moment. Créez-en un avec le bouton ci-dessus.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {surveys.map((survey) => (
            <SurveyCard key={survey.id} survey={survey} />
          ))}
        </div>
      )}
    </div>
  );
}
