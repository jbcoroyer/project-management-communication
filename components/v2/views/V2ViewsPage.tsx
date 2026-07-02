"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, ListChecks, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import V2AppShell from "../AppShell";
import { useCurrentUser } from "../../../lib/useCurrentUser";
import { useReferenceData } from "../../../lib/useReferenceData";
import { useTasks } from "../../../lib/useTasks";
import { priorities } from "../../../lib/types";
import { DONE_COLUMN_NAME } from "../../../lib/workflowConstants";
import { useSavedViews, viewToQuery } from "../../../lib/v2/savedViews";
import { useCustomFields, type CustomFieldType } from "../../../lib/v2/customFields";

type Tab = "views" | "fields";

export default function V2ViewsPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { domains, companies, admins } = useReferenceData();
  const { tasks } = useTasks();
  const { views, add: addView, remove: removeView } = useSavedViews();
  const { defs, addDef, removeDef, setValue, getValue } = useCustomFields();

  const [tab, setTab] = useState<Tab>("views");

  // Saved view form
  const [vName, setVName] = useState("");
  const [vQuery, setVQuery] = useState("");
  const [vDomain, setVDomain] = useState("");
  const [vCompany, setVCompany] = useState("");
  const [vPriority, setVPriority] = useState("");
  const [vAssignee, setVAssignee] = useState("");

  // Custom field form
  const [fName, setFName] = useState("");
  const [fType, setFType] = useState<CustomFieldType>("text");
  const [fOptions, setFOptions] = useState("");

  const activeTasks = useMemo(
    () => tasks.filter((t) => !t.isArchived && !t.parentTaskId && t.column !== DONE_COLUMN_NAME).slice(0, 40),
    [tasks],
  );

  const saveView = () => {
    if (!vName.trim()) return;
    addView({
      name: vName.trim(),
      query: vQuery.trim(),
      domain: vDomain || null,
      company: vCompany || null,
      priority: vPriority || null,
      assignee: vAssignee || null,
    });
    setVName("");
    setVQuery("");
    setVDomain("");
    setVCompany("");
    setVPriority("");
    setVAssignee("");
  };

  const saveField = () => {
    if (!fName.trim()) return;
    addDef({
      name: fName.trim(),
      type: fType,
      options: fType === "select" ? fOptions.split(",").map((o) => o.trim()).filter(Boolean) : [],
    });
    setFName("");
    setFOptions("");
    setFType("text");
  };

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
            <SlidersHorizontal className="h-3.5 w-3.5" /> Vues &amp; champs · V2
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Vues sauvegardées &amp; champs personnalisés</h1>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
            Enregistrez vos filtres favoris et ajoutez des champs métier sur les tâches.
          </p>
        </header>

        <nav className="flex gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-1">
          {[
            { id: "views" as const, label: "Vues sauvegardées", icon: Bookmark },
            { id: "fields" as const, label: "Champs personnalisés", icon: ListChecks },
          ].map((t) => {
            const Icon = t.icon;
            const on = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={[
                  "ui-transition inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
                  on ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "text-[color:var(--foreground)]/60 hover:bg-[var(--surface)]",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </nav>

        {tab === "views" ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
            <section className="ui-surface rounded-2xl p-5">
              <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">Nouvelle vue</h2>
              <div className="space-y-3">
                <input
                  value={vName}
                  onChange={(e) => setVName(e.target.value)}
                  placeholder="Nom (ex : Print IDENA urgent)"
                  className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                />
                <input
                  value={vQuery}
                  onChange={(e) => setVQuery(e.target.value)}
                  placeholder="Mots-clés (optionnel)"
                  className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select value={vDomain} onChange={(e) => setVDomain(e.target.value)} className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-sm">
                    <option value="">Tous domaines</option>
                    {domains.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
                  </select>
                  <select value={vCompany} onChange={(e) => setVCompany(e.target.value)} className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-sm">
                    <option value="">Toutes sociétés</option>
                    {companies.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                  <select value={vPriority} onChange={(e) => setVPriority(e.target.value)} className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-sm">
                    <option value="">Toutes priorités</option>
                    {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  <select value={vAssignee} onChange={(e) => setVAssignee(e.target.value)} className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-sm">
                    <option value="">Tous assignés</option>
                    {admins.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={saveView}
                  className="ui-transition inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-strong)]"
                >
                  <Plus className="h-4 w-4" /> Enregistrer la vue
                </button>
              </div>
            </section>

            <section className="ui-surface rounded-2xl p-5">
              <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">Mes vues ({views.length})</h2>
              {views.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-10 text-center text-sm text-[color:var(--foreground)]/55">
                  Aucune vue enregistrée.
                </p>
              ) : (
                <ul className="space-y-2">
                  {views.map((v) => (
                    <li key={v.id} className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
                      <button
                        type="button"
                        onClick={() => router.push(`/v2/dashboard/list?q=${encodeURIComponent(viewToQuery(v))}`)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-semibold text-[var(--foreground)]">{v.name}</p>
                        <p className="truncate text-[11px] text-[color:var(--foreground)]/55">
                          {viewToQuery(v) || "(sans filtre)"}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeView(v.id)}
                        className="ui-transition shrink-0 text-[color:var(--foreground)]/45 hover:text-[var(--danger)]"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
              <section className="ui-surface rounded-2xl p-5">
                <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">Nouveau champ</h2>
                <div className="space-y-3">
                  <input
                    value={fName}
                    onChange={(e) => setFName(e.target.value)}
                    placeholder="Nom du champ (ex : N° de BAT)"
                    className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                  />
                  <select value={fType} onChange={(e) => setFType(e.target.value as CustomFieldType)} className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm">
                    <option value="text">Texte</option>
                    <option value="number">Nombre</option>
                    <option value="date">Date</option>
                    <option value="select">Liste de choix</option>
                  </select>
                  {fType === "select" ? (
                    <input
                      value={fOptions}
                      onChange={(e) => setFOptions(e.target.value)}
                      placeholder="Options séparées par des virgules"
                      className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={saveField}
                    className="ui-transition inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-strong)]"
                  >
                    <Plus className="h-4 w-4" /> Ajouter le champ
                  </button>
                </div>
                <h3 className="mb-2 mt-5 text-sm font-semibold text-[var(--foreground)]">Champs définis ({defs.length})</h3>
                <ul className="space-y-1.5">
                  {defs.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs">
                      <span className="text-[var(--foreground)]"><strong>{d.name}</strong> · {d.type}</span>
                      <button type="button" onClick={() => removeDef(d.id)} className="ui-transition text-[color:var(--foreground)]/45 hover:text-[var(--danger)]" aria-label="Supprimer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="ui-surface overflow-x-auto rounded-2xl p-5">
                <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">Valeurs par tâche</h2>
                {defs.length === 0 ? (
                  <p className="text-sm text-[color:var(--foreground)]/55">Créez d'abord un champ personnalisé.</p>
                ) : (
                  <table className="w-full min-w-[520px] border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="px-2 py-2 text-left text-[11px] uppercase text-[color:var(--foreground)]/45">Tâche</th>
                        {defs.map((d) => (
                          <th key={d.id} className="px-2 py-2 text-left text-[11px] uppercase text-[color:var(--foreground)]/45">{d.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeTasks.map((t) => (
                        <tr key={t.id} className="border-t border-[var(--line)]">
                          <td className="max-w-[180px] truncate px-2 py-1.5 text-[var(--foreground)]">{t.projectName}</td>
                          {defs.map((d) => (
                            <td key={d.id} className="px-2 py-1.5">
                              {d.type === "select" ? (
                                <select
                                  value={getValue(t.id, d.id)}
                                  onChange={(e) => setValue(t.id, d.id, e.target.value)}
                                  className="ui-focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs"
                                >
                                  <option value="">—</option>
                                  {d.options.map((o) => <option key={o} value={o}>{o}</option>)}
                                </select>
                              ) : (
                                <input
                                  type={d.type === "number" ? "number" : d.type === "date" ? "date" : "text"}
                                  value={getValue(t.id, d.id)}
                                  onChange={(e) => setValue(t.id, d.id, e.target.value)}
                                  className="ui-focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs"
                                />
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </V2AppShell>
  );
}
