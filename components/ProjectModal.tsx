"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { projectStatuses, type ProjectStatus, type StockProjectDraft } from "../lib/stockTypes";
import { toastError } from "../lib/toast";

type ProjectModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (draft: StockProjectDraft) => Promise<void> | void;
};

export default function ProjectModal(props: ProjectModalProps) {
  const { open, onClose, onSubmit } = props;
  const [name, setName] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("Actif");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setStatus("Actif");
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toastError("Le nom du projet ou de l'événement est obligatoire.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        status,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="ui-surface w-full max-w-xl rounded-[28px] p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/50">
              Projets stock
            </p>
            <h2 className="ui-heading mt-1 text-2xl font-semibold text-[var(--foreground)]">
              Ajouter un projet / événement
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-transition rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2 text-[color:var(--foreground)]/60 hover:bg-[var(--surface-soft)]"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Nom du projet / événement
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
                placeholder="Ex. Salon de l'emploi 2026"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Statut
              </label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as ProjectStatus)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              >
                {projectStatuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="ui-transition rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="ui-transition rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#fffdf9] shadow-sm hover:bg-[var(--accent-strong)] disabled:opacity-60"
            >
              {submitting ? "Enregistrement..." : "Créer le projet"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
