"use client";

import { useMemo, useState } from "react";
import { Plus, Target, Trash2 } from "lucide-react";
import { useCurrentUser } from "../../../lib/useCurrentUser";
import { useReferenceData } from "../../../lib/useReferenceData";
import { useTasks } from "../../../lib/useTasks";
import { keyResultProgress, objectiveProgress, useObjectives } from "../../../lib/v2/okr";

export default function V2OkrPage() {
  const { user } = useCurrentUser();
  const { companies, domains } = useReferenceData();
  const { tasks } = useTasks();
  const { objectives, addObjective, removeObjective, addKeyResult, updateKeyResult, removeKeyResult } = useObjectives();

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [period, setPeriod] = useState(new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" }));

  const [krDrafts, setKrDrafts] = useState<Record<string, { label: string; domain: string; target: number }>>({});

  const activeTasks = useMemo(() => tasks.filter((t) => !t.isArchived && !t.parentTaskId), [tasks]);

  const createObjective = () => {
    if (!title.trim()) return;
    addObjective(title.trim(), company || null, period);
    setTitle("");
    setCompany("");
  };

  const draftFor = (id: string) => krDrafts[id] ?? { label: "", domain: "", target: 0 };
  const setDraft = (id: string, patch: Partial<{ label: string; domain: string; target: number }>) =>
    setKrDrafts((prev) => ({ ...prev, [id]: { ...draftFor(id), ...patch } }));

  const submitKr = (objectiveId: string) => {
    const d = draftFor(objectiveId);
    if (!d.label.trim()) return;
    addKeyResult(objectiveId, { label: d.label.trim(), linkedDomain: d.domain || null, target: d.target || 0, current: 0 });
    setKrDrafts((prev) => ({ ...prev, [objectiveId]: { label: "", domain: "", target: 0 } }));
  };

  return (
      <div className="space-y-5">
        <header className="ui-surface rounded-2xl border-l-4 border-l-[var(--accent)] p-5">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            <Target className="h-3.5 w-3.5" /> Objectifs · V2
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">OKR reliés aux tâches</h1>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
            Reliez chaque résultat clé à un domaine pour une progression calculée automatiquement.
          </p>
        </header>

        <section className="ui-surface rounded-2xl p-5">
          <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">Nouvel objectif</h2>
          <div className="flex flex-wrap gap-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Objectif (ex : Renforcer la notoriété digitale)" className="ui-focus-ring min-w-[240px] flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm" />
            <select value={company} onChange={(e) => setCompany(e.target.value)} className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm">
              <option value="">Groupe</option>
              {companies.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Période" className="ui-focus-ring w-40 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm" />
            <button type="button" onClick={createObjective} className="ui-transition inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-strong)]">
              <Plus className="h-4 w-4" /> Créer
            </button>
          </div>
        </section>

        {objectives.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-12 text-center text-sm text-[color:var(--foreground)]/55">
            Aucun objectif défini.
          </p>
        ) : (
          <div className="space-y-4">
            {objectives.map((obj) => {
              const progress = objectiveProgress(obj, activeTasks);
              const draft = draftFor(obj.id);
              return (
                <section key={obj.id} className="ui-surface rounded-2xl p-5">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-[var(--foreground)]">{obj.title}</h3>
                      <p className="text-[11px] text-[color:var(--foreground)]/55">{obj.company ?? "Groupe"} · {obj.period}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-[var(--accent)]">{Math.round(progress * 100)}%</span>
                      <button type="button" onClick={() => removeObjective(obj.id)} className="ui-transition text-[color:var(--foreground)]/40 hover:text-[var(--danger)]" aria-label="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mb-4 h-2 overflow-hidden rounded-full bg-[var(--surface-soft)]">
                    <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.round(progress * 100)}%` }} />
                  </div>

                  <ul className="space-y-2">
                    {obj.keyResults.map((kr) => {
                      const p = keyResultProgress(kr, activeTasks);
                      return (
                        <li key={kr.id} className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-[var(--foreground)]">{kr.label}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-[color:var(--foreground)]/60">
                                {p.auto ? `${p.value}/${kr.target || "?"} (auto)` : `${kr.current}/${kr.target}`}
                              </span>
                              {!p.auto ? (
                                <input
                                  type="number"
                                  value={kr.current}
                                  onChange={(e) => updateKeyResult(obj.id, kr.id, { current: Number(e.target.value) || 0 })}
                                  className="ui-focus-ring w-20 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs"
                                />
                              ) : null}
                              <button type="button" onClick={() => removeKeyResult(obj.id, kr.id)} className="ui-transition text-[color:var(--foreground)]/40 hover:text-[var(--danger)]" aria-label="Supprimer">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-soft)]">
                            <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.round(p.ratio * 100)}%` }} />
                          </div>
                          {kr.linkedDomain ? (
                            <p className="mt-1 text-[10px] text-[color:var(--foreground)]/45">Lié au domaine {kr.linkedDomain}</p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--line)] pt-3">
                    <input value={draft.label} onChange={(e) => setDraft(obj.id, { label: e.target.value })} placeholder="Résultat clé" className="ui-focus-ring min-w-[180px] flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm" />
                    <select value={draft.domain} onChange={(e) => setDraft(obj.id, { domain: e.target.value })} className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 text-sm">
                      <option value="">Manuel</option>
                      {domains.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
                    </select>
                    <input type="number" value={draft.target || ""} onChange={(e) => setDraft(obj.id, { target: Number(e.target.value) || 0 })} placeholder="Cible" className="ui-focus-ring w-24 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 text-sm" />
                    <button type="button" onClick={() => submitKr(obj.id)} className="ui-transition inline-flex items-center gap-1 rounded-lg border border-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)]">
                      <Plus className="h-3.5 w-3.5" /> KR
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
  );
}
