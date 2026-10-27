"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TuesdayLoader } from "@/components/brand";
import { useWorkspace } from "../../lib/useWorkspace";
import {
  WORKSPACE_MODULE_KEYS,
  WORKSPACE_MODULE_META,
  type WorkspaceModuleKey,
  type WorkspaceModules,
} from "../../lib/workspaceModules";
import { toastError, toastSuccess } from "../../lib/toast";
import { DEFAULT_HOME_PATH } from "../../lib/appVersion";

function defaultSelection(): WorkspaceModules {
  return {
    tableau: true,
    livrables: false,
    events: false,
    medias: false,
    idees: false,
    stock: false,
  };
}

export default function OnboardingModulesPage() {
  const router = useRouter();
  const {
    loading,
    workspace,
    needsModulesOnboarding,
    isWorkspaceAdmin,
    saveModules,
  } = useWorkspace();
  const [selected, setSelected] = useState<WorkspaceModules>(defaultSelection);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!needsModulesOnboarding) {
      router.replace(DEFAULT_HOME_PATH);
    }
  }, [loading, needsModulesOnboarding, router]);

  const canSubmit = useMemo(
    () => WORKSPACE_MODULE_KEYS.some((k) => selected[k]),
    [selected],
  );

  const toggle = (key: WorkspaceModuleKey) => {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const submit = async () => {
    if (!canSubmit) {
      toastError("Cochez au moins un module.");
      return;
    }
    setSaving(true);
    try {
      await saveModules(selected);
      toastSuccess("Votre espace est prêt");
      const first =
        WORKSPACE_MODULE_KEYS.find((k) => selected[k]) ?? "tableau";
      router.replace(WORKSPACE_MODULE_META[first].href);
      router.refresh();
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !needsModulesOnboarding) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <TuesdayLoader size={36} />
      </div>
    );
  }

  if (!isWorkspaceAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
        <p className="text-sm text-[color:var(--foreground)]/60">
          Demandez à un admin de votre espace de choisir les modules.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            Bienvenue
          </p>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            De quoi avez-vous besoin ?
          </h1>
          <p className="text-sm text-[color:var(--foreground)]/60">
            Espace <span className="font-medium text-[var(--foreground)]">{workspace?.name}</span>
            . Cochez uniquement ce dont vous avez besoin ; chaque module est expliqué
            ci-dessous.
          </p>
        </header>

        <ul className="space-y-3">
          {WORKSPACE_MODULE_KEYS.map((key) => {
            const meta = WORKSPACE_MODULE_META[key];
            const checked = selected[key];
            return (
              <li key={key}>
                <label
                  className={[
                    "ui-transition flex cursor-pointer gap-3 rounded-2xl border p-4",
                    checked
                      ? "border-[var(--accent)] bg-[var(--surface)] shadow-sm"
                      : "border-[var(--line)] bg-[var(--surface-soft)]/50 hover:border-[color:var(--foreground)]/20",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(key)}
                    className="mt-1 h-4 w-4 accent-[var(--accent)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold text-[var(--foreground)]">
                      {meta.label}
                    </span>
                    <span className="mt-1 block text-sm text-[color:var(--foreground)]/55">
                      {meta.description}
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={saving || !canSubmit}
            onClick={() => void submit()}
            className="ui-btn ui-btn-primary"
          >
            {saving ? "Enregistrement…" : "Continuer"}
          </button>
        </div>
      </div>
    </div>
  );
}
