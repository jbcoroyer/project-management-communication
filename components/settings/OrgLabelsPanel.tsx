"use client";

import { useEffect, useState } from "react";
import { Save, Type } from "lucide-react";
import { useWorkspace } from "../../lib/useWorkspace";
import { useServices } from "../../lib/servicesContext";
import {
  DEFAULT_ORG_LABELS,
  ORG_LABEL_KEYS,
  type OrgLabelKey,
  type OrgLabels,
} from "../../lib/orgLabels";
import { toastError, toastSuccess } from "../../lib/toast";

const LABEL_HINTS: Record<OrgLabelKey, string> = {
  domain: "Ex. Domaine, Famille produit, Ligne",
  company: "Ex. Marque, Client, Entité",
  admin: "Ex. Responsable, Assigné, Chef de projet",
  column: "Ex. Colonne, Étape, Statut",
  task: "Ex. Tâche, Demande, Ticket",
  board: "Ex. Tableau, Projet, Espace",
  service: "Ex. Service, Équipe, Pôle",
};

export default function OrgLabelsPanel() {
  const { workspace, isWorkspaceAdmin } = useWorkspace();
  const { orgLabels, saveOrgLabels } = useServices();
  const [draft, setDraft] = useState<OrgLabels>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft({ ...orgLabels });
  }, [orgLabels, workspace?.id]);

  if (!workspace) return null;

  const dirty = ORG_LABEL_KEYS.some(
    (k) => (draft[k]?.trim() || "") !== (orgLabels[k]?.trim() || ""),
  );

  const save = async () => {
    setBusy(true);
    try {
      const cleaned: OrgLabels = {};
      for (const k of ORG_LABEL_KEYS) {
        const v = draft[k]?.trim();
        if (v) cleaned[k] = v;
      }
      await saveOrgLabels(cleaned);
      toastSuccess("Libellés enregistrés");
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="ui-surface space-y-4 rounded-2xl p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            Vocabulaire
          </p>
          <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
            <Type className="h-5 w-5 text-[var(--accent)]" aria-hidden />
            Libellés de l’espace
          </h2>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
            Adaptez le vocabulaire à vos métiers. Laissez vide pour garder le
            libellé neutre par défaut.
          </p>
        </div>
        {isWorkspaceAdmin ? (
          <button
            type="button"
            disabled={!dirty || busy}
            onClick={() => void save()}
            className="ui-btn ui-btn-primary"
          >
            <Save className="h-4 w-4" aria-hidden />
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
        ) : null}
      </header>

      {!isWorkspaceAdmin ? (
        <p className="text-sm text-[color:var(--foreground)]/50">
          Seuls les admins peuvent modifier les libellés.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {ORG_LABEL_KEYS.map((key) => (
            <li key={key} className="space-y-1">
              <label
                htmlFor={`org-label-${key}`}
                className="text-xs font-medium text-[color:var(--foreground)]/65"
              >
                {DEFAULT_ORG_LABELS[key]}
              </label>
              <input
                id={`org-label-${key}`}
                type="text"
                maxLength={48}
                placeholder={DEFAULT_ORG_LABELS[key]}
                value={draft[key] ?? ""}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, [key]: e.target.value }))
                }
                className="ui-input w-full"
              />
              <p className="text-[11px] text-[color:var(--foreground)]/40">
                {LABEL_HINTS[key]}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
