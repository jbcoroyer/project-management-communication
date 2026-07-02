"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Activity,
  FlaskConical,
  Plus,
  Trash2,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import V2AppShell from "../AppShell";
import { useCurrentUser } from "../../../lib/useCurrentUser";
import { useReferenceData } from "../../../lib/useReferenceData";
import { useTasks } from "../../../lib/useTasks";
import {
  applyPlaceholders,
  assessWeekRisks,
  buildSkillProfiles,
  buildWeekKeys,
  buildWeeklyWorkload,
  suggestStaffing,
  usePlaceholders,
  WEEKLY_CAPACITY,
  type WeekKey,
} from "../../../lib/v2/capacity";

type Tab = "heatmap" | "scenarios" | "staffing";

const RISK_STYLE: Record<string, string> = {
  under: "bg-sky-100 text-sky-800",
  ok: "bg-emerald-100 text-emerald-800",
  high: "bg-amber-100 text-amber-800",
  over: "bg-rose-100 text-rose-800",
};

const WEEK_COUNT = 8;

function weekLabel(week: WeekKey): string {
  return format(parseISO(week), "d MMM", { locale: fr });
}

function cellColor(hours: number): { bg: string; text: string } {
  const ratio = hours / WEEKLY_CAPACITY;
  if (hours === 0) return { bg: "var(--surface-soft)", text: "var(--foreground)" };
  if (ratio > 1) return { bg: "var(--danger)", text: "#fff" };
  if (ratio > 0.85) return { bg: "var(--warning)", text: "#3a2a00" };
  return { bg: `color-mix(in srgb, var(--accent) ${Math.round(ratio * 60)}%, var(--surface))`, text: "var(--foreground)" };
}

export default function V2CapacityPage() {
  const { user } = useCurrentUser();
  const { admins, domains } = useReferenceData();
  const { tasks } = useTasks();
  const { placeholders, add, remove, toggleConfirmed } = usePlaceholders();

  const [tab, setTab] = useState<Tab>("heatmap");
  const [scenarioOn, setScenarioOn] = useState(true);

  const weekKeys = useMemo(() => buildWeekKeys(WEEK_COUNT), []);
  const people = useMemo(() => admins.map((a) => a.name).filter(Boolean), [admins]);

  const baseline = useMemo(() => buildWeeklyWorkload(tasks, weekKeys, people), [tasks, weekKeys, people]);
  const adjusted = useMemo(
    () => applyPlaceholders(baseline, weekKeys, placeholders),
    [baseline, weekKeys, placeholders],
  );
  const activeLoads = scenarioOn && placeholders.length > 0 ? adjusted : baseline;
  const risks = useMemo(() => assessWeekRisks(activeLoads, weekKeys), [activeLoads, weekKeys]);

  const profiles = useMemo(() => buildSkillProfiles(tasks, people), [tasks, people]);

  // Formulaire placeholder
  const [phName, setPhName] = useState("");
  const [phPerson, setPhPerson] = useState("");
  const [phHours, setPhHours] = useState(10);
  const [phStart, setPhStart] = useState<WeekKey>(weekKeys[0]);
  const [phWeeks, setPhWeeks] = useState(2);

  // Staffing
  const [staffDomain, setStaffDomain] = useState(domains[0]?.name ?? "");
  const [staffHours, setStaffHours] = useState(10);
  const [staffWeek, setStaffWeek] = useState<WeekKey>(weekKeys[0]);
  const staffing = useMemo(
    () => (staffDomain ? suggestStaffing(staffDomain, staffHours, profiles, activeLoads, staffWeek) : []),
    [staffDomain, staffHours, profiles, activeLoads, staffWeek],
  );

  const addPlaceholder = () => {
    if (!phName.trim()) return;
    add({
      name: phName.trim(),
      person: phPerson || null,
      domain: null,
      hoursPerWeek: phHours,
      startWeek: phStart,
      weeks: phWeeks,
      confirmed: false,
    });
    setPhName("");
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
            <Users className="h-3.5 w-3.5" /> Charge d'équipe · V2
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Capacité &amp; scénarios</h1>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
            Heatmap prédictive, projets tentatifs et staffing par compétence — base {WEEKLY_CAPACITY} h/personne/semaine.
          </p>
        </header>

        <nav className="flex flex-wrap items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-1">
          {[
            { id: "heatmap" as const, label: "Heatmap & risques", icon: Activity },
            { id: "scenarios" as const, label: "Scénarios", icon: FlaskConical },
            { id: "staffing" as const, label: "Staffing compétences", icon: UserCheck },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={[
                  "ui-transition inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
                  active ? "bg-[var(--accent)] text-[var(--accent-contrast)]" : "text-[color:var(--foreground)]/60 hover:bg-[var(--surface)]",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </nav>

        {tab === "heatmap" ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {risks.map((r) => (
                  <div
                    key={r.week}
                    className={`rounded-lg px-2.5 py-1.5 text-center ${RISK_STYLE[r.level]}`}
                    title={`${Math.round(r.utilization * 100)}% d'utilisation`}
                  >
                    <p className="text-[10px] font-semibold uppercase">{weekLabel(r.week)}</p>
                    <p className="text-xs font-bold">{Math.round(r.utilization * 100)}%</p>
                  </div>
                ))}
              </div>
              {placeholders.length > 0 ? (
                <label className="inline-flex items-center gap-2 text-sm font-medium text-[color:var(--foreground)]/70">
                  <input
                    type="checkbox"
                    checked={scenarioOn}
                    onChange={(e) => setScenarioOn(e.target.checked)}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  Inclure scénarios ({placeholders.length})
                </label>
              ) : null}
            </div>

            <section className="ui-surface overflow-x-auto rounded-2xl p-4">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-left text-[11px] uppercase text-[color:var(--foreground)]/45">Personne</th>
                    {weekKeys.map((wk) => (
                      <th key={wk} className="px-1 py-2 text-center text-[11px] font-semibold text-[color:var(--foreground)]/55">
                        {weekLabel(wk)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeLoads.length === 0 ? (
                    <tr>
                      <td colSpan={weekKeys.length + 1} className="py-8 text-center text-sm text-[color:var(--foreground)]/55">
                        Aucune charge planifiée.
                      </td>
                    </tr>
                  ) : (
                    activeLoads.map((p) => (
                      <tr key={p.person} className="border-t border-[var(--line)]">
                        <td className="px-2 py-2 text-sm font-semibold text-[var(--foreground)]">{p.person}</td>
                        {weekKeys.map((wk) => {
                          const h = p.byWeek[wk] ?? 0;
                          const c = cellColor(h);
                          return (
                            <td key={wk} className="px-1 py-1.5 text-center">
                              <div
                                className="mx-auto flex h-9 w-full max-w-[60px] items-center justify-center rounded-lg text-[11px] font-bold"
                                style={{ backgroundColor: c.bg, color: h === 0 ? "color-mix(in srgb, var(--foreground) 25%, transparent)" : c.text }}
                                title={`${h.toFixed(1)} h / ${WEEKLY_CAPACITY} h`}
                              >
                                {h === 0 ? "·" : `${Math.round((h / WEEKLY_CAPACITY) * 100)}%`}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>

            {risks.some((r) => r.level === "over") ? (
              <section className="ui-surface rounded-2xl p-5">
                <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-[var(--foreground)]">
                  <TrendingUp className="h-4 w-4 text-[var(--danger)]" /> Semaines à risque
                </h2>
                <ul className="space-y-1.5">
                  {risks
                    .filter((r) => r.level === "over")
                    .map((r) => (
                      <li key={r.week} className="text-sm text-[color:var(--foreground)]/75">
                        Semaine du <strong>{weekLabel(r.week)}</strong> : {Math.round(r.utilization * 100)}% de la capacité
                        {r.overloadedPeople.length > 0 ? ` — surcharge : ${r.overloadedPeople.join(", ")}` : ""}.
                      </li>
                    ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : null}

        {tab === "scenarios" ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
            <section className="ui-surface rounded-2xl p-5">
              <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">Nouveau projet tentatif</h2>
              <div className="space-y-3">
                <input
                  value={phName}
                  onChange={(e) => setPhName(e.target.value)}
                  placeholder="Nom du projet (ex : Salon SPACE 2026)"
                  className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                />
                <select
                  value={phPerson}
                  onChange={(e) => setPhPerson(e.target.value)}
                  className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                >
                  <option value="">Non staffé (placeholder)</option>
                  {people.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-3 gap-2">
                  <label className="block">
                    <span className="text-[11px] font-semibold text-[color:var(--foreground)]/55">h/semaine</span>
                    <input
                      type="number"
                      min={1}
                      value={phHours}
                      onChange={(e) => setPhHours(Number(e.target.value) || 0)}
                      className="ui-focus-ring mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold text-[color:var(--foreground)]/55">Début</span>
                    <select
                      value={phStart}
                      onChange={(e) => setPhStart(e.target.value)}
                      className="ui-focus-ring mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-sm"
                    >
                      {weekKeys.map((wk) => (
                        <option key={wk} value={wk}>
                          {weekLabel(wk)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold text-[color:var(--foreground)]/55">Nb sem.</span>
                    <input
                      type="number"
                      min={1}
                      max={WEEK_COUNT}
                      value={phWeeks}
                      onChange={(e) => setPhWeeks(Number(e.target.value) || 1)}
                      className="ui-focus-ring mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-2 py-2 text-sm"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={addPlaceholder}
                  className="ui-transition inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-contrast)] hover:bg-[var(--accent-strong)]"
                >
                  <Plus className="h-4 w-4" /> Ajouter au scénario
                </button>
              </div>
            </section>

            <section className="ui-surface rounded-2xl p-5">
              <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">Projets tentatifs</h2>
              {placeholders.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-10 text-center text-sm text-[color:var(--foreground)]/55">
                  Simulez l'impact d'un projet non confirmé sur la charge d'équipe.
                </p>
              ) : (
                <ul className="space-y-2">
                  {placeholders.map((ph) => (
                    <li key={ph.id} className="flex items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--foreground)]">{ph.name}</p>
                        <p className="text-[11px] text-[color:var(--foreground)]/55">
                          {ph.person ?? "Non staffé"} · {ph.hoursPerWeek} h/sem · {ph.weeks} sem. dès {weekLabel(ph.startWeek)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => toggleConfirmed(ph.id)}
                          className={[
                            "ui-transition rounded-lg border px-2 py-1 text-[11px] font-semibold",
                            ph.confirmed
                              ? "border-[var(--success)] bg-emerald-50 text-[var(--success)]"
                              : "border-[var(--line-strong)] text-[color:var(--foreground)]/60",
                          ].join(" ")}
                        >
                          {ph.confirmed ? "Confirmé" : "Tentatif"}
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(ph.id)}
                          className="ui-transition rounded-lg border border-[var(--line-strong)] p-1.5 text-[color:var(--foreground)]/50 hover:text-[var(--danger)]"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}

        {tab === "staffing" ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
            <section className="ui-surface rounded-2xl p-5">
              <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">Besoin à staffer</h2>
              <div className="space-y-3">
                <label className="block">
                  <span className="text-[11px] font-semibold text-[color:var(--foreground)]/55">Domaine / compétence</span>
                  <select
                    value={staffDomain}
                    onChange={(e) => setStaffDomain(e.target.value)}
                    className="ui-focus-ring mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                  >
                    {domains.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[11px] font-semibold text-[color:var(--foreground)]/55">Heures nécessaires</span>
                    <input
                      type="number"
                      min={1}
                      value={staffHours}
                      onChange={(e) => setStaffHours(Number(e.target.value) || 0)}
                      className="ui-focus-ring mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-semibold text-[color:var(--foreground)]/55">Semaine</span>
                    <select
                      value={staffWeek}
                      onChange={(e) => setStaffWeek(e.target.value)}
                      className="ui-focus-ring mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                    >
                      {weekKeys.map((wk) => (
                        <option key={wk} value={wk}>
                          {weekLabel(wk)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            </section>

            <section className="ui-surface rounded-2xl p-5">
              <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">Suggestions de staffing</h2>
              {staffing.length === 0 ? (
                <p className="text-sm text-[color:var(--foreground)]/55">Aucun collaborateur disponible.</p>
              ) : (
                <ul className="space-y-2">
                  {staffing.map((s, idx) => (
                    <li
                      key={s.person}
                      className={[
                        "flex items-center gap-3 rounded-xl border p-3",
                        idx === 0 ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--line)] bg-[var(--surface)]",
                      ].join(" ")}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-soft)] text-xs font-bold text-[var(--foreground)]">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--foreground)]">{s.person}</p>
                        <p className="text-[11px] text-[color:var(--foreground)]/55">
                          Affinité {staffDomain} : {Math.round(s.affinity * 100)}% · dispo {s.availableHours.toFixed(0)} h cette semaine
                        </p>
                      </div>
                      <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-xs font-bold text-[var(--accent)]">
                        {Math.round(s.score * 100)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </V2AppShell>
  );
}
