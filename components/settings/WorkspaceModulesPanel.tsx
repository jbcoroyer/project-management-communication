"use client";

import { useEffect, useState } from "react";
import { LayoutGrid, Save } from "lucide-react";
import { useWorkspace } from "../../lib/useWorkspace";
import {
  WORKSPACE_MODULE_KEYS,
  WORKSPACE_MODULE_META,
  type WorkspaceModuleKey,
  type WorkspaceModules,
} from "../../lib/workspaceModules";
import { toastError, toastSuccess } from "../../lib/toast";

export default function WorkspaceModulesPanel() {
  const {
    workspace,
    modules,
    isWorkspaceAdmin,
    loading,
    saveModules,
  } = useWorkspace();
  const [draft, setDraft] = useState<WorkspaceModules>(modules);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(modules);
  }, [modules, workspace?.id]);

  if (loading || !workspace) return null;

  if (workspace.isServiceCommunication) {
    return (
      <section className="ui-surface space-y-3 rounded-2xl p-5">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            Modules
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">
            Modules de l’espace
          </h2>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
            L’espace Service Communication conserve tous les modules. Cette
            configuration n’est pas modifiable.
          </p>
        </header>
      </section>
    );
  }

  const dirty = WORKSPACE_MODULE_KEYS.some((k) => draft[k] !== modules[k]);
  const atLeastOne = WORKSPACE_MODULE_KEYS.some((k) => draft[k]);

  const toggle = (key: WorkspaceModuleKey) => {
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const save = async () => {
    if (!atLeastOne) {
      toastError("Laissez au moins un module activé.");
      return;
    }
    setBusy(true);
    try {
      await saveModules(draft);
      toastSuccess("Modules mis à jour");
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
            Modules
          </p>
          <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
            <LayoutGrid className="h-5 w-5 text-[var(--accent)]" aria-hidden />
            Modules de l’espace — {workspace.name}
          </h2>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
            Ajoutez ou masquez des onglets dans la navigation (Tableau, Stock,
            Événements…). Les données déjà créées ne sont pas effacées si vous
            masquez un module.
          </p>
        </div>
        {isWorkspaceAdmin ? (
          <button
            type="button"
            disabled={!dirty || busy || !atLeastOne}
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
          Seuls les admins / owners peuvent modifier les modules.
        </p>
      ) : (
        <ul className="space-y-2">
          {WORKSPACE_MODULE_KEYS.map((key) => {
            const meta = WORKSPACE_MODULE_META[key];
            const checked = draft[key];
            return (
              <li key={key}>
                <label
                  className={[
                    "ui-transition flex cursor-pointer gap-3 rounded-xl border p-3.5",
                    checked
                      ? "border-[var(--accent)]/50 bg-[var(--surface)]"
                      : "border-[var(--line)] bg-[var(--surface-soft)]/40",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(key)}
                    className="mt-1 h-4 w-4 accent-[var(--accent)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[var(--foreground)]">
                      {meta.label}
                    </span>
                    <span className="mt-0.5 block text-[13px] text-[color:var(--foreground)]/55">
                      {meta.description}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
