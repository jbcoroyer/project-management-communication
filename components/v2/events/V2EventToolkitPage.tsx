"use client";

import { useMemo, useState } from "react";
import { Boxes, CalendarClock, CheckCircle2, Loader2, Package, Plus, Rocket, Trash2 } from "lucide-react";
import V2AppShell from "../AppShell";
import { useCurrentUser } from "../../../lib/useCurrentUser";
import { useEvents } from "../../../lib/useEvents";
import { useReferenceData } from "../../../lib/useReferenceData";
import { toastError, toastSuccess } from "../../../lib/toast";
import { createQuickTask } from "../../../lib/v2/createTask";
import { buildRetroPlan } from "../../../lib/v2/retroPlanning";
import { ASSET_CATEGORIES, useEventAssets, type AssetCategory } from "../../../lib/v2/eventAssets";

type Tab = "retro" | "assets";

export default function V2EventToolkitPage() {
  const { user } = useCurrentUser();
  const { events } = useEvents();
  const { companies } = useReferenceData();
  const { assets, add, update, remove } = useEventAssets();

  const [tab, setTab] = useState<Tab>("retro");
  const upcoming = useMemo(
    () => [...events].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [events],
  );
  const [eventId, setEventId] = useState("");
  const selectedEvent = useMemo(() => events.find((e) => e.id === eventId) ?? upcoming[0], [events, eventId, upcoming]);
  const retroPlan = useMemo(() => (selectedEvent ? buildRetroPlan(selectedEvent) : []), [selectedEvent]);

  const [pushing, setPushing] = useState(false);
  const [pushed, setPushed] = useState(false);

  const pushRetroToKanban = async () => {
    if (!selectedEvent || pushing) return;
    setPushing(true);
    try {
      const company = companies[0]?.name ?? "IDENA";
      for (const step of retroPlan) {
        await createQuickTask({
          projectName: `[${selectedEvent.name}] ${step.label}`,
          company,
          domain: step.domain,
          adminName: "",
          deadline: step.date,
          priority: step.priority,
          estimatedHours: step.estimatedHours,
          eventId: selectedEvent.id,
        });
      }
      setPushed(true);
      toastSuccess(`${retroPlan.length} tâches créées dans le Kanban`);
    } catch (error) {
      toastError(error instanceof Error ? error.message : "Création impossible");
    } finally {
      setPushing(false);
    }
  };

  // Asset form
  const [aName, setAName] = useState("");
  const [aCategory, setACategory] = useState<AssetCategory>("Stand");
  const [aLocation, setALocation] = useState("");
  const [aQty, setAQty] = useState(1);

  const addAsset = () => {
    if (!aName.trim()) return;
    add({ name: aName.trim(), category: aCategory, location: aLocation.trim(), quantity: aQty, assignedEventId: null, notes: "" });
    setAName("");
    setALocation("");
    setAQty(1);
  };

  const eventName = (id: string | null) => (id ? events.find((e) => e.id === id)?.name ?? "—" : null);

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
            <Rocket className="h-3.5 w-3.5" /> Boîte à outils Événements · V2
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Rétroplanning &amp; assets stand</h1>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
            Générez un rétroplanning daté et gérez le matériel réutilisable entre salons.
          </p>
        </header>

        <nav className="flex gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-1">
          {[
            { id: "retro" as const, label: "Rétroplanning", icon: CalendarClock },
            { id: "assets" as const, label: "Assets stand", icon: Boxes },
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

        {tab === "retro" ? (
          <section className="ui-surface rounded-2xl p-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <label className="block">
                <span className="text-[11px] font-semibold text-[color:var(--foreground)]/55">Événement</span>
                <select
                  value={selectedEvent?.id ?? ""}
                  onChange={(e) => {
                    setEventId(e.target.value);
                    setPushed(false);
                  }}
                  className="ui-focus-ring mt-1 w-72 max-w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                >
                  {upcoming.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} — {new Date(e.startDate).toLocaleDateString("fr-FR")}
                    </option>
                  ))}
                </select>
              </label>
              {selectedEvent && retroPlan.length > 0 ? (
                <button
                  type="button"
                  onClick={() => void pushRetroToKanban()}
                  disabled={pushing || pushed}
                  className="ui-transition inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-strong)] disabled:opacity-50"
                >
                  {pushing ? <Loader2 className="h-4 w-4 animate-spin" /> : pushed ? <CheckCircle2 className="h-4 w-4" /> : <Rocket className="h-4 w-4" />}
                  {pushed ? "Tâches créées" : "Pousser vers le Kanban"}
                </button>
              ) : null}
            </div>

            {!selectedEvent ? (
              <p className="text-sm text-[color:var(--foreground)]/55">Aucun événement disponible.</p>
            ) : (
              <ol className="relative space-y-3 border-l-2 border-[var(--line)] pl-5">
                {retroPlan.map((step) => (
                  <li key={step.label} className="relative">
                    <span className="absolute -left-[27px] flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-[9px] font-bold text-[var(--accent-contrast)]">
                      {step.offsetDays <= 0 ? "" : "+"}
                    </span>
                    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[var(--foreground)]">{step.label}</p>
                        <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--accent)]">
                          {step.dayLabel}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-[color:var(--foreground)]/55">
                        {new Date(step.date).toLocaleDateString("fr-FR")} · {step.domain} · {step.priority} · {step.estimatedHours} h
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
            <section className="ui-surface rounded-2xl p-5">
              <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">Nouvel asset</h2>
              <div className="space-y-3">
                <input value={aName} onChange={(e) => setAName(e.target.value)} placeholder="Nom (ex : Comptoir pliable)" className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm" />
                <select value={aCategory} onChange={(e) => setACategory(e.target.value as AssetCategory)} className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm">
                  {ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input value={aLocation} onChange={(e) => setALocation(e.target.value)} placeholder="Lieu / stockage" className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm" />
                  <input type="number" min={1} value={aQty} onChange={(e) => setAQty(Number(e.target.value) || 1)} className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm" />
                </div>
                <button type="button" onClick={addAsset} className="ui-transition inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-strong)]">
                  <Plus className="h-4 w-4" /> Ajouter
                </button>
              </div>
            </section>

            <section className="ui-surface rounded-2xl p-5">
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
                <Package className="h-4 w-4 text-[var(--accent)]" /> Inventaire ({assets.length})
              </h2>
              {assets.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-10 text-center text-sm text-[color:var(--foreground)]/55">
                  Recensez displays, mobilier et collatéraux réutilisables entre salons.
                </p>
              ) : (
                <ul className="space-y-2">
                  {assets.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                          {a.name} <span className="text-[color:var(--foreground)]/45">×{a.quantity}</span>
                        </p>
                        <p className="text-[11px] text-[color:var(--foreground)]/55">
                          {a.category}{a.location ? ` · ${a.location}` : ""}
                          {a.assignedEventId ? ` · affecté à ${eventName(a.assignedEventId)}` : ""}
                        </p>
                      </div>
                      <select
                        value={a.assignedEventId ?? ""}
                        onChange={(e) => update(a.id, { assignedEventId: e.target.value || null })}
                        className="ui-focus-ring rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-xs"
                      >
                        <option value="">Non affecté</option>
                        {upcoming.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                      <button type="button" onClick={() => remove(a.id)} className="ui-transition shrink-0 text-[color:var(--foreground)]/45 hover:text-[var(--danger)]" aria-label="Supprimer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </V2AppShell>
  );
}
