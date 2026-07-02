"use client";

import { useMemo, useState } from "react";
import { Building2, CheckCircle2, Circle, Clock, ExternalLink } from "lucide-react";
import V2AppShell from "../AppShell";
import { useCurrentUser } from "../../../lib/useCurrentUser";
import { useTasks } from "../../../lib/useTasks";
import { DONE_COLUMN_NAME } from "../../../lib/workflowConstants";

const STATUS_META: Record<string, { label: string; className: string; icon: typeof Circle }> = {
  "À faire": { label: "Reçue", className: "bg-[var(--surface-soft)] text-[color:var(--foreground)]/60", icon: Circle },
  "En cours": { label: "En cours", className: "bg-sky-100 text-sky-800", icon: Clock },
  "En validation": { label: "En validation", className: "bg-amber-100 text-amber-800", icon: Clock },
  "Terminé": { label: "Livrée", className: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
};

export default function V2ClientPortalPage() {
  const { user } = useCurrentUser();
  const { tasks } = useTasks();

  const clientTasks = useMemo(
    () => tasks.filter((t) => t.isClientRequest && !t.isArchived && !t.parentTaskId),
    [tasks],
  );

  const clients = useMemo(() => {
    const set = new Set<string>();
    for (const t of clientTasks) {
      const name = t.clientName?.trim();
      if (name) set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [clientTasks]);

  const [client, setClient] = useState("ALL");

  const visible = useMemo(
    () => (client === "ALL" ? clientTasks : clientTasks.filter((t) => t.clientName?.trim() === client)),
    [clientTasks, client],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof visible>();
    for (const t of visible) {
      const key = t.clientName?.trim() || "Sans client";
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [visible]);

  return (
    <V2AppShell
      currentUserName={user?.teamMemberName ?? user?.displayName ?? undefined}
      currentUserEmail={user?.email}
      currentUserAvatarUrl={user?.avatarUrl}
      currentUserJobTitle={user?.jobTitle}
    >
      <div className="space-y-5">
        <header className="ui-surface rounded-2xl border-l-4 border-l-[var(--accent)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
                <ExternalLink className="h-3.5 w-3.5" /> Portail client · V2
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Suivi des demandes clients</h1>
              <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
                Vue épurée du statut des demandes, sans exposer l'interne.
              </p>
            </div>
            <select
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold"
            >
              <option value="ALL">Tous les clients</option>
              {clients.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </header>

        {grouped.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-12 text-center text-sm text-[color:var(--foreground)]/55">
            Aucune demande client à afficher.
          </p>
        ) : (
          <div className="space-y-4">
            {grouped.map(([name, items]) => {
              const done = items.filter((t) => t.column === DONE_COLUMN_NAME).length;
              return (
                <section key={name} className="ui-surface rounded-2xl p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
                      <Building2 className="h-4 w-4 text-[var(--accent)]" /> {name}
                    </h2>
                    <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--foreground)]/60">
                      {done}/{items.length} livrées
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {items.map((t) => {
                      const meta = STATUS_META[t.column] ?? STATUS_META["À faire"];
                      const Icon = meta.icon;
                      return (
                        <li key={t.id} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[var(--foreground)]">{t.projectName}</p>
                            <p className="text-[11px] text-[color:var(--foreground)]/55">
                              {t.company}{t.deadline ? ` · échéance ${new Date(t.deadline).toLocaleDateString("fr-FR")}` : ""}
                            </p>
                          </div>
                          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}>
                            <Icon className="h-3 w-3" /> {meta.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </V2AppShell>
  );
}
