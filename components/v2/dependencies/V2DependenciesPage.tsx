"use client";

import { useMemo, useState } from "react";
import { GitBranch, Link2, Route, Trash2, X } from "lucide-react";
import V2AppShell from "../AppShell";
import { useCurrentUser } from "../../../lib/useCurrentUser";
import { useTasks } from "../../../lib/useTasks";
import { toastError } from "../../../lib/toast";
import { computeCriticalPath, useDependencies } from "../../../lib/v2/dependencies";
import { DONE_COLUMN_NAME } from "../../../lib/workflowConstants";

export default function V2DependenciesPage() {
  const { user } = useCurrentUser();
  const { tasks } = useTasks();
  const { deps, add, remove } = useDependencies();

  const activeTasks = useMemo(
    () => tasks.filter((t) => !t.isArchived && !t.parentTaskId && t.column !== DONE_COLUMN_NAME),
    [tasks],
  );
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  const [blockerId, setBlockerId] = useState("");
  const [blockedId, setBlockedId] = useState("");

  const critical = useMemo(() => computeCriticalPath(activeTasks, deps), [activeTasks, deps]);
  const criticalSet = useMemo(() => new Set(critical.path), [critical]);

  const handleAdd = () => {
    if (!blockerId || !blockedId) return;
    const res = add(blockerId, blockedId);
    if (!res.ok) toastError(res.reason ?? "Impossible d'ajouter la dépendance");
    else {
      setBlockerId("");
      setBlockedId("");
    }
  };

  const label = (id: string) => byId.get(id)?.projectName ?? "(tâche supprimée)";

  return (
    <V2AppShell
      currentUserName={user?.teamMemberName ?? user?.displayName ?? undefined}
      currentUserEmail={user?.email}
      currentUserAvatarUrl={user?.avatarUrl}
      currentUserJobTitle={user?.jobTitle}
    >
      <div className="space-y-5">
        <header className="ui-surface rounded-2xl border-l-4 border-l-[var(--accent)] p-5">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            <GitBranch className="h-3.5 w-3.5" /> Dépendances · V2
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Dépendances &amp; chemin critique</h1>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
            Liez les tâches (bloque / bloqué par) pour sécuriser les enchaînements print → validation → digital.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
          <section className="ui-surface rounded-2xl p-5">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
              <Link2 className="h-4 w-4 text-[var(--accent)]" /> Nouvelle dépendance
            </h2>
            <div className="space-y-3">
              <label className="block">
                <span className="text-[11px] font-semibold text-[color:var(--foreground)]/55">Cette tâche…</span>
                <select
                  value={blockerId}
                  onChange={(e) => setBlockerId(e.target.value)}
                  className="ui-focus-ring mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                >
                  <option value="">— choisir —</option>
                  {activeTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.projectName}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-center text-xs font-semibold text-[var(--accent)]">doit être terminée avant ↓</p>
              <label className="block">
                <span className="text-[11px] font-semibold text-[color:var(--foreground)]/55">…cette tâche</span>
                <select
                  value={blockedId}
                  onChange={(e) => setBlockedId(e.target.value)}
                  className="ui-focus-ring mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                >
                  <option value="">— choisir —</option>
                  {activeTasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.projectName}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!blockerId || !blockedId}
                className="ui-transition inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-strong)] disabled:opacity-50"
              >
                <Link2 className="h-4 w-4" /> Lier
              </button>
            </div>

            <h3 className="mb-2 mt-5 text-sm font-semibold text-[var(--foreground)]">Liens existants ({deps.length})</h3>
            {deps.length === 0 ? (
              <p className="text-sm text-[color:var(--foreground)]/55">Aucune dépendance définie.</p>
            ) : (
              <ul className="space-y-1.5">
                {deps.map((d) => (
                  <li key={d.id} className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs">
                    <span className="min-w-0 flex-1 text-[var(--foreground)]">
                      <strong>{label(d.blockerId)}</strong> <span className="text-[color:var(--foreground)]/45">→</span> {label(d.blockedId)}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(d.id)}
                      className="ui-transition shrink-0 text-[color:var(--foreground)]/45 hover:text-[var(--danger)]"
                      aria-label="Supprimer le lien"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="ui-surface rounded-2xl p-5">
            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
              <Route className="h-4 w-4 text-[var(--danger)]" /> Chemin critique
            </h2>
            <p className="mb-3 text-sm text-[color:var(--foreground)]/55">
              Chaîne la plus longue : <strong>{critical.totalHours.toFixed(1)} h</strong> cumulées.
            </p>
            {critical.path.length <= 1 ? (
              <p className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-8 text-center text-sm text-[color:var(--foreground)]/55">
                Ajoutez des dépendances pour visualiser le chemin critique.
              </p>
            ) : (
              <ol className="space-y-2">
                {critical.path.map((id, idx) => (
                  <li key={id} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--danger)] text-xs font-bold text-white">
                      {idx + 1}
                    </span>
                    <div className="flex-1 rounded-lg border border-[var(--danger)]/40 bg-rose-50 px-3 py-2">
                      <p className="text-sm font-semibold text-[var(--foreground)]">{label(id)}</p>
                      <p className="text-[11px] text-[color:var(--foreground)]/55">
                        {byId.get(id)?.column ?? ""} · {byId.get(id)?.admins.join(", ") || "non assigné"}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <h3 className="mb-2 mt-5 text-sm font-semibold text-[var(--foreground)]">Tâches bloquées</h3>
            <ul className="space-y-1">
              {deps.length === 0 ? (
                <li className="text-sm text-[color:var(--foreground)]/55">—</li>
              ) : (
                Array.from(new Set(deps.map((d) => d.blockedId))).map((id) => {
                  const blockers = deps.filter((d) => d.blockedId === id).map((d) => label(d.blockerId));
                  return (
                    <li
                      key={id}
                      className={[
                        "rounded-lg px-3 py-2 text-xs",
                        criticalSet.has(id) ? "bg-rose-50 text-[var(--foreground)]" : "bg-[var(--surface-soft)] text-[color:var(--foreground)]/70",
                      ].join(" ")}
                    >
                      <strong>{label(id)}</strong> bloquée par : {blockers.join(", ")}
                    </li>
                  );
                })
              )}
            </ul>
          </section>
        </div>
      </div>
    </V2AppShell>
  );
}
