"use client";

import AutomationsManager from "./AutomationsManager";
import AdminSettingsPanel from "../../settings/AdminSettingsPanel";
import { useReferenceData } from "../../../lib/useReferenceData";

export default function V2SettingsPage() {
  const { admins, columns, domains } = useReferenceData();

  return (
      <div className="space-y-8">
        <section className="space-y-5">
          <header className="ui-surface rounded-2xl border-l-4 border-l-[var(--accent)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Paramètres · V2</p>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Automatisations &amp; règles</h1>
            <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
              Configurez les règles « si… alors… » et l&apos;auto-archivage.
            </p>
          </header>

          <AutomationsManager
            columns={columns.map((c) => c.name)}
            domains={domains.map((d) => d.name)}
            admins={admins.map((a) => a.name)}
          />
        </section>

        <AdminSettingsPanel />
      </div>
  );
}
