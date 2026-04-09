"use client";

import { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BarChart3, Clock, FolderKanban, PieChart as PieChartIcon, Users } from "lucide-react";
import { defaultDomainColor, domainCalendarColors } from "../lib/kanbanStyles";
import type { Task } from "../lib/types";

function formatHours(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0 h";
  return `${(ms / 3600000).toFixed(1)} h`;
}

export default function AnalyticsView(props: { tasks: Task[] }) {
  const [periodDays, setPeriodDays] = useState<30 | 90 | 365>(30);
  const [now] = useState(() => Date.now());
  const periodStart = now - periodDays * 24 * 60 * 60 * 1000;

  const inPeriod = useMemo(
    () =>
      props.tasks.filter((task) => {
        if (task.parentTaskId) return false;
        const rawDate = task.requestDate || task.createdAt;
        if (!rawDate) return false;
        return new Date(rawDate).getTime() >= periodStart;
      }),
    [periodStart, props.tasks],
  );

  const pieData = useMemo(
    () =>
      Object.entries(
        inPeriod.reduce<Record<string, number>>((acc, t) => {
          const d = t.domain || "Autre";
          acc[d] = (acc[d] ?? 0) + (t.elapsedMs ?? 0);
          return acc;
        }, {}),
      ).map(([name, value]) => ({ name, value })),
    [inPeriod],
  );

  const barData = useMemo(
    () =>
      Object.entries(
        inPeriod.reduce<Record<string, number>>((acc, t) => {
          const c = t.company || "N/A";
          acc[c] = (acc[c] ?? 0) + 1;
          return acc;
        }, {}),
      )
        .map(([company, count]) => ({ company, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
    [inPeriod],
  );

  const topClients = useMemo(
    () =>
      Object.entries(
        inPeriod
          .filter((t) => t.isClientRequest && t.clientName)
          .reduce<Record<string, number>>((acc, t) => {
            const name = (t.clientName || "").trim() || "Sans nom";
            acc[name] = (acc[name] ?? 0) + 1;
            return acc;
          }, {}),
      )
        .map(([clientName, count]) => ({ clientName, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    [inPeriod],
  );

  const totalElapsedMs = useMemo(
    () => inPeriod.reduce((sum, t) => sum + (t.elapsedMs ?? 0), 0),
    [inPeriod],
  );

  const clientRequestsCount = useMemo(
    () => inPeriod.filter((t) => t.isClientRequest).length,
    [inPeriod],
  );

  const topDomain = useMemo(() => {
    if (pieData.length === 0) return null;
    return [...pieData].sort((a, b) => b.value - a.value)[0];
  }, [pieData]);

  return (
    <div className="space-y-5">
      <header className="ui-surface flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
        <div>
          <h2 className="ui-heading text-2xl font-semibold text-[var(--foreground)]">Analytics</h2>
          <p className="mt-1 text-sm text-[color:var(--foreground)]/65">
            Indicateurs clés sur les projets créés ou mis à jour sur la période (hors sous-tâches).
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-[var(--line)] bg-[var(--surface)] p-1">
          {([30, 90, 365] as const).map((dayValue) => (
            <button
              key={dayValue}
              type="button"
              onClick={() => setPeriodDays(dayValue)}
              className={[
                "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                periodDays === dayValue
                  ? "bg-[var(--accent)] text-[#fffdf9]"
                  : "text-[color:var(--foreground)]/65 hover:bg-[var(--surface-soft)]",
              ].join(" ")}
            >
              {dayValue} j
            </button>
          ))}
        </div>
      </header>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="ui-surface flex gap-3 rounded-2xl p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-[color:var(--foreground)]/75">
            <FolderKanban className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--foreground)]/45">
              Projets (période)
            </p>
            <p className="ui-heading text-2xl font-semibold tabular-nums">{inPeriod.length}</p>
          </div>
        </div>
        <div className="ui-surface flex gap-3 rounded-2xl p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <Clock className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--foreground)]/45">
              Temps enregistré
            </p>
            <p className="ui-heading text-2xl font-semibold tabular-nums">
              {formatHours(totalElapsedMs)}
            </p>
          </div>
        </div>
        <div className="ui-surface flex gap-3 rounded-2xl p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--foreground)]/45">
              Demandes clients
            </p>
            <p className="ui-heading text-2xl font-semibold tabular-nums">{clientRequestsCount}</p>
          </div>
        </div>
        <div className="ui-surface flex gap-3 rounded-2xl p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-800">
            <PieChartIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--foreground)]/45">
              Domaine le plus actif
            </p>
            <p className="truncate text-lg font-semibold leading-tight text-[var(--foreground)]">
              {topDomain ? topDomain.name : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="ui-surface rounded-2xl p-5">
          <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
            <PieChartIcon className="h-4 w-4 text-[color:var(--foreground)]/50" />
            Temps par domaine
          </h3>
          {pieData.length === 0 ? (
            <p className="text-sm text-[color:var(--foreground)]/55">Aucune donnée sur cette période.</p>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={domainCalendarColors[entry.name] ?? defaultDomainColor}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: unknown) => [
                      formatHours(Number(value ?? 0)),
                      "Temps",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="ui-surface rounded-2xl p-5">
          <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
            <BarChart3 className="h-4 w-4 text-[color:var(--foreground)]/50" />
            Volume par société
          </h3>
          {barData.length === 0 ? (
            <p className="text-sm text-[color:var(--foreground)]/55">Aucune donnée sur cette période.</p>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="company"
                    angle={-35}
                    textAnchor="end"
                    height={56}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
                  <Tooltip />
                  <Bar dataKey="count" name="Demandes" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <section className="ui-surface rounded-2xl p-5">
        <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)]">Top clients</h3>
        {topClients.length === 0 ? (
          <p className="text-sm text-[color:var(--foreground)]/65">
            Aucune demande client sur cette période.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {topClients.map(({ clientName, count }, i) => (
              <li
                key={clientName}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-soft)] text-xs font-semibold text-[color:var(--foreground)]/75">
                    {i + 1}
                  </span>
                  <span className="truncate">{clientName}</span>
                </span>
                <span className="shrink-0 rounded-full bg-[color:var(--foreground)]/12 px-2 py-0.5 text-[11px] font-semibold text-[color:var(--foreground)]/85">
                  {count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
