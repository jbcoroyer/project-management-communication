"use client";

import { useState } from "react";
import { CheckCircle2, Send, Sparkles } from "lucide-react";
import { defaultCompanies, priorities, type Priority } from "../../lib/types";
import { submitIntakeRequest, suggestDomainFromText } from "../../lib/v2/intake";
import { useReferenceData } from "../../lib/useReferenceData";
import { toastError, toastSuccess } from "../../lib/toast";

export default function AskForm() {
  const { companies: companyRecords } = useReferenceData();
  const companyOptions = companyRecords.length > 0 ? companyRecords.map((c) => c.name) : [...defaultCompanies];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [company, setCompany] = useState(companyOptions[0] ?? "IDENA");
  const [concern, setConcern] = useState("");
  const [deadline, setDeadline] = useState("");
  const [budget, setBudget] = useState("");
  const [estimatedHours, setEstimatedHours] = useState("");
  const [requesterName, setRequesterName] = useState("");
  const [requesterService, setRequesterService] = useState("");
  const [priority, setPriority] = useState<Priority>("Moyenne");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const suggestion =
    title || description || concern ? suggestDomainFromText(`${title} ${concern} ${description}`) : null;

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCompany(companyOptions[0] ?? "IDENA");
    setConcern("");
    setDeadline("");
    setBudget("");
    setEstimatedHours("");
    setRequesterName("");
    setRequesterService("");
    setPriority("Moyenne");
    setDone(false);
  };

  const submit = async () => {
    if (!title.trim() || !deadline || busy) return;
    setBusy(true);
    try {
      const result = await submitIntakeRequest({
        title: title.trim(),
        description: description.trim(),
        company,
        concern: concern.trim(),
        deadline,
        budget: budget.trim(),
        estimatedHours: Number(estimatedHours) || 0,
        requesterName: requesterName.trim(),
        requesterService: requesterService.trim(),
        priority,
      });
      if (result.ok) {
        setDone(true);
        toastSuccess("Demande envoyée au service Communication");
      } else {
        toastError("Envoi impossible. Réessayez.");
      }
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="ui-surface mx-auto max-w-xl rounded-2xl border-l-4 border-l-[var(--accent)] p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-[var(--success)]" />
        <h1 className="mt-3 text-xl font-semibold text-[var(--foreground)]">Demande envoyée</h1>
        <p className="mt-2 text-sm text-[color:var(--foreground)]/60">
          Le service Communication va la qualifier dans son triage. Merci !
        </p>
        <button
          type="button"
          onClick={resetForm}
          className="ui-transition mt-5 inline-flex items-center gap-2 rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
        >
          Nouvelle demande
        </button>
      </div>
    );
  }

  return (
    <div className="ui-surface mx-auto max-w-xl rounded-2xl border-l-4 border-l-[var(--accent)] p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Portail de demandes · V2</p>
      <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Soumettre une demande</h1>
      <p className="mt-2 text-sm text-[color:var(--foreground)]/60">
        Renseignez un maximum d&apos;informations pour pré-configurer la tâche côté Communication.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="mt-5 space-y-4"
      >
        <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/70">
          Objet de la demande *
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Ex. Flyer pour le salon de mars"
            className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/70">
          Ce que cela concerne *
          <input
            value={concern}
            onChange={(e) => setConcern(e.target.value)}
            required
            placeholder="Ex. Salon VIV Europe, campagne print Q3, site web filiale…"
            className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/70">
            Entité *
            <select
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
              className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
            >
              {companyOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/70">
            Échéance *
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
              className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/70">
          Description détaillée
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Contexte, livrables attendus, contraintes techniques, références visuelles…"
            className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
          />
        </label>

        {suggestion ? (
          <p className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent)]">
            <Sparkles className="h-3.5 w-3.5" /> Domaine suggéré : {suggestion}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/70">
            Budget indicatif
            <input
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Ex. 2 500 €"
              className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/70">
            Charge estimée (heures)
            <input
              type="number"
              min={0}
              step={0.5}
              value={estimatedHours}
              onChange={(e) => setEstimatedHours(e.target.value)}
              placeholder="Ex. 8"
              className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/70">
            Votre nom
            <input
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/70">
            Service / société
            <input
              value={requesterService}
              onChange={(e) => setRequesterService(e.target.value)}
              className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/70">
          Priorité
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
          >
            {priorities.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={busy || !title.trim() || !concern.trim() || !deadline}
          className="ui-transition inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-strong)] disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> Envoyer la demande
        </button>
      </form>
    </div>
  );
}
