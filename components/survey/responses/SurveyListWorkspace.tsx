"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronRight, ClipboardList, Plus, X } from "lucide-react";
import { createSurvey, listSurveys, type SurveyListItem } from "../../../app/actions/survey";
import { toastError, toastSuccess } from "../../../lib/toast";

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "d MMM yyyy", { locale: fr });
  } catch {
    return iso;
  }
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
            Sélectionnez un questionnaire pour ouvrir le formulaire, modifier les questions ou
            consulter les réponses.
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

      {loading ? (
        <p className="text-sm text-[color:var(--foreground)]/55">Chargement des questionnaires…</p>
      ) : surveys.length === 0 ? (
        <div className="ui-surface rounded-2xl p-8 text-center text-sm text-[color:var(--foreground)]/55">
          Aucun questionnaire pour le moment. Créez-en un avec le bouton ci-dessus.
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--foreground)]/45">
            {surveys.length} questionnaire{surveys.length !== 1 ? "s" : ""}
          </p>
          {surveys.map((survey) => (
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
                {survey.description ? (
                  <p className="mt-1 text-sm text-[color:var(--foreground)]/60">
                    {survey.description}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-[color:var(--foreground)]/45">
                  Créé le {formatDate(survey.createdAt)} ·{" "}
                  {survey.responseCount} réponse{survey.responseCount !== 1 ? "s" : ""}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-[color:var(--foreground)]/30 group-hover:text-[var(--accent)]" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
