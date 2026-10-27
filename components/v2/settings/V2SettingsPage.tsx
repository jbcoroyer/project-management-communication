"use client";

import AdminSettingsPanel from "../../settings/AdminSettingsPanel";
import WorkspaceMembersPanel from "../../settings/WorkspaceMembersPanel";
import WorkspaceModulesPanel from "../../settings/WorkspaceModulesPanel";
import DeleteAccountPanel from "../../settings/DeleteAccountPanel";
import { usePathname } from "next/navigation";
import V2PageHeader from "../V2PageHeader";

export default function V2SettingsPage() {
  const pathname = usePathname();
  const isModernUi = pathname.startsWith("/v2") || pathname.startsWith("/v3");

  return (
    <div className="space-y-8">
      <section className="space-y-5">
        {isModernUi ? (
          <V2PageHeader
            kicker="Outils"
            title="Réglages"
            description="Modules, membres de l’espace et paramètres de référence."
          />
        ) : (
          <header className="ui-surface rounded-2xl border-l-4 border-l-[var(--accent)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              Paramètres
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Réglages</h1>
            <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
              Modules, membres de l’espace et paramètres de référence.
            </p>
          </header>
        )}
      </section>

      <WorkspaceModulesPanel />

      <WorkspaceMembersPanel />

      <AdminSettingsPanel />

      <DeleteAccountPanel />
    </div>
  );
}
