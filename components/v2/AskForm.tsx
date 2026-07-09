"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { defaultCompanies } from "../../lib/types";
import { submitIntakeRequest } from "../../lib/v2/intake";
import { useReferenceData } from "../../lib/useReferenceData";
import { useCurrentUser } from "../../lib/useCurrentUser";
import { toastError, toastSuccess } from "../../lib/toast";

export default function AskForm() {
  const { companies: companyRecords } = useReferenceData();
  const { user } = useCurrentUser();
  const companyOptions = companyRecords.length > 0 ? companyRecords.map((c) => c.name) : [...defaultCompanies];

  const [projectName, setProjectName] = useState("");
  const [expectedSupport, setExpectedSupport] = useState("");
  const [supportFormat, setSupportFormat] = useState("");
  const [company, setCompany] = useState(companyOptions[0] ?? "IDENA");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const resetForm = () => {
    setProjectName("");
    setExpectedSupport("");
    setSupportFormat("");
    setCompany(companyOptions[0] ?? "IDENA");
    setDeadline("");
    setDescription("");
    setDone(false);
  };

  const submit = async () => {
    if (!projectName.trim() || !expectedSupport.trim() || !supportFormat.trim() || !deadline || busy) return;
    setBusy(true);
    try {
      const requesterName = user?.teamMemberName ?? user?.displayName ?? "";
      const requesterService = user?.email ?? "";
      const result = await submitIntakeRequest({
        title: projectName.trim(),
        expectedSupport: expectedSupport.trim(),
        supportFormat: supportFormat.trim(),
        company,
        deadline,
        description: description.trim(),
        requesterName,
        requesterService,
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
          Le service Communication va qualifier votre demande (budget, charge, priorité) avant de la transformer en
          tâche.
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
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
        Portail collaborateurs externes
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Soumettre une demande</h1>
      <p className="mt-2 text-sm text-[color:var(--foreground)]/60">
        Décrivez votre besoin en communication. Le budget, la charge estimée et la priorité seront définis par
        l&apos;équipe lors du triage.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="mt-5 space-y-4"
      >
        <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/70">
          Nom du projet *
          <input
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            required
            placeholder="Ex. Campagne salon VIV Europe"
            className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/70">
          Support attendu *
          <input
            value={expectedSupport}
            onChange={(e) => setExpectedSupport(e.target.value)}
            required
            placeholder="Ex. Flyer, visuel réseaux sociaux, kakémono, plaquette…"
            className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-[color:var(--foreground)]/70">
          Format du support *
          <input
            value={supportFormat}
            onChange={(e) => setSupportFormat(e.target.value)}
            required
            list="support-format-suggestions"
            placeholder="Ex. A4 print, PDF, carré Instagram 1080×1080, bannière web 1200×628…"
            className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
          />
          <datalist id="support-format-suggestions">
            <option value="A4 print" />
            <option value="A3 print" />
            <option value="PDF" />
            <option value="Carré Instagram 1080×1080" />
            <option value="Story Instagram 1080×1920" />
            <option value="Post LinkedIn 1200×627" />
            <option value="Bannière web" />
            <option value="Roll-up 85×200 cm" />
            <option value="Kakémono" />
          </datalist>
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
          Description du projet
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="Contexte, objectifs, public cible, contraintes, références visuelles, liens utiles…"
            className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-normal text-[var(--foreground)]"
          />
        </label>

        <button
          type="submit"
          disabled={
            busy ||
            !projectName.trim() ||
            !expectedSupport.trim() ||
            !supportFormat.trim() ||
            !deadline
          }
          className="ui-transition inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-strong)] disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> Envoyer la demande
        </button>
      </form>
    </div>
  );
}
