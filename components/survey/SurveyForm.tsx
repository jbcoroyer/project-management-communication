"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, PartyPopper, Send, Sparkles } from "lucide-react";
import { fetchSurveyDefinition, submitSurveyResponse } from "../../app/actions/survey";
import { NO_OPINION, satisfaction2026 } from "../../lib/survey/satisfaction2026";
import { isQuestionVisible } from "../../lib/survey/surveyDefinitionUtils";
import { defaultCompanies } from "../../lib/types";
import type { Question, SurveyAnswers, SurveyDefinition } from "../../lib/survey/surveyTypes";
import { toastError } from "../../lib/toast";
import { useReferenceData } from "../../lib/useReferenceData";
import QuestionField from "./QuestionField";

type Phase = "intro" | "form" | "done";

type SurveyFormProps = {
  surveyId?: string;
};

function isAnswered(question: Question, value: SurveyAnswers[string]): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  return false;
}

export default function SurveyForm({ surveyId = "satisfaction-2026" }: SurveyFormProps) {
  const { companies } = useReferenceData();
  const [definition, setDefinition] = useState<SurveyDefinition>(satisfaction2026);
  const [phase, setPhase] = useState<Phase>("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetchSurveyDefinition(surveyId).then((result) => {
      if (result.ok) setDefinition(result.definition);
    });
  }, [surveyId]);

  const entityOptions = useMemo(() => {
    const names = companies.map((c) => c.name).filter(Boolean);
    const base = names.length > 0 ? names : [...defaultCompanies];
    return [...base, NO_OPINION];
  }, [companies]);

  const selectedPrestations = useMemo(
    () => (Array.isArray(answers.q4) ? answers.q4 : []),
    [answers.q4],
  );

  // Étapes visibles = étapes dont au moins une question est affichée (logique conditionnelle).
  const visibleSteps = useMemo(() => {
    return definition.steps
      .map((step) => ({
        step,
        questions: step.questionIds
          .map((id) => definition.questions.find((q) => q.id === id))
          .filter((q): q is Question => Boolean(q))
          .filter((q) => isQuestionVisible(q, selectedPrestations)),
      }))
      .filter((entry) => entry.questions.length > 0);
  }, [definition, selectedPrestations]);

  const totalSteps = visibleSteps.length;
  const safeIndex = Math.min(stepIndex, Math.max(0, totalSteps - 1));
  const current = visibleSteps[safeIndex];
  const isLastStep = safeIndex >= totalSteps - 1;
  const progress = totalSteps > 0 ? Math.round(((safeIndex + 1) / totalSteps) * 100) : 0;

  const setAnswer = (id: string, value: SurveyAnswers[string]) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const currentStepValid = useMemo(() => {
    if (!current) return true;
    return current.questions.every(
      (q) => !q.required || isAnswered(q, answers[q.id]),
    );
  }, [current, answers]);

  const goNext = () => {
    if (!currentStepValid) {
      toastError("Merci de répondre aux questions obligatoires (*) avant de continuer.");
      return;
    }
    if (isLastStep) {
      void handleSubmit();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, totalSteps - 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStepIndex((i) => Math.max(0, i - 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    // Le nom (q23) est envoyé séparément et retiré du corps des réponses.
    const { q23, ...rest } = answers;
    const respondentName = typeof q23 === "string" ? q23.trim() : "";
    const result = await submitSurveyResponse({
      surveyVersion: definition.version,
      answers: rest,
      respondentName: respondentName || null,
    });
    setSubmitting(false);
    if (!result.ok) {
      toastError(result.error);
      return;
    }
    setPhase("done");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const firstName = useMemo(() => {
    const raw = typeof answers.q23 === "string" ? answers.q23.trim() : "";
    return raw ? raw.split(/\s+/)[0] : "";
  }, [answers.q23]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-8 sm:py-12">
      <header className="mb-6 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-[color:var(--foreground)]/50">
        <Sparkles className="h-4 w-4 text-[var(--accent)]" />
        Service Communication IDENA
      </header>

      <AnimatePresence mode="wait">
        {phase === "intro" ? (
          <motion.section
            key="intro"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="ui-surface flex flex-1 flex-col justify-center rounded-[28px] p-8 sm:p-12"
          >
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--foreground)] text-[var(--accent-contrast)]">
              <Sparkles className="h-8 w-8" strokeWidth={1.75} />
            </div>
            <h1 className="ui-display text-3xl font-semibold text-[var(--foreground)] sm:text-4xl">
              {definition.intro.title}
            </h1>
            <p className="mt-3 max-w-lg text-base leading-relaxed text-[color:var(--foreground)]/65">
              {definition.intro.subtitle}
            </p>
            <p className="mt-2 text-sm text-[color:var(--foreground)]/45">
              ⏱️ Environ {definition.intro.estimatedMinutes} minutes · {totalSteps} étapes
            </p>
            <button
              type="button"
              onClick={() => {
                setPhase("form");
                setStepIndex(0);
              }}
              className="ui-btn ui-btn-primary mt-8 w-full justify-center gap-2 py-3.5 text-base sm:w-auto sm:px-8"
            >
              Commencer
              <ArrowRight className="h-5 w-5" />
            </button>
          </motion.section>
        ) : null}

        {phase === "form" && current ? (
          <motion.section
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 flex-col"
          >
            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[color:var(--foreground)]/50">
                <span>
                  Étape {safeIndex + 1} sur {totalSteps}
                </span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-soft)]">
                <motion.div
                  className="h-full rounded-full bg-[var(--accent)]"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={current.step.id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
                className="ui-surface flex-1 rounded-[24px] p-6 sm:p-8"
              >
                <p className="ui-kicker mb-1">{current.step.title}</p>
                {current.step.subtitle ? (
                  <p className="mb-6 text-sm text-[color:var(--foreground)]/55">
                    {current.step.subtitle}
                  </p>
                ) : null}

                <div className="space-y-8">
                  {current.questions.map((q) => (
                    <QuestionField
                      key={q.id}
                      question={q}
                      value={answers[q.id]}
                      onChange={(v) => setAnswer(q.id, v)}
                      optionsOverride={q.id === "q1" ? entityOptions : undefined}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goBack}
                disabled={safeIndex === 0 || submitting}
                className="ui-btn ui-btn-ghost gap-2 disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={submitting}
                className="ui-btn ui-btn-primary gap-2 px-6 py-3"
              >
                {isLastStep ? (
                  <>
                    {submitting ? "Envoi…" : "Envoyer mes réponses"}
                    <Send className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Continuer
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </motion.section>
        ) : null}

        {phase === "done" ? (
          <motion.section
            key="done"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="ui-surface flex flex-1 flex-col items-center justify-center rounded-[28px] p-8 text-center sm:p-12"
          >
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
              className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent)] text-white"
            >
              <PartyPopper className="h-10 w-10" strokeWidth={1.75} />
            </motion.div>
            <h1 className="ui-display text-3xl font-semibold text-[var(--foreground)]">
              {firstName ? `Merci ${firstName} !` : "Merci beaucoup !"}
            </h1>
            <p className="mt-3 max-w-md text-base leading-relaxed text-[color:var(--foreground)]/65">
              Vos réponses ont bien été enregistrées. Elles vont directement aider le service
              Communication à progresser. On vous en est très reconnaissants !
            </p>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
