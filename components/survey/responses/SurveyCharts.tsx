"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChoiceDistribution, RatingStat } from "../../../lib/survey/surveyAnalytics";

const ACCENT = "#bc5a3c";

export function RatingAveragesChart({ stats }: { stats: RatingStat[] }) {
  const data = stats
    .filter((s) => s.average != null)
    .map((s) => ({
      name: s.label.length > 42 ? `${s.label.slice(0, 40)}…` : s.label,
      note: s.average != null ? Number(s.average.toFixed(2)) : 0,
      max: s.scaleMax,
    }));

  if (data.length === 0) {
    return <p className="text-sm text-[color:var(--foreground)]/55">Aucune note pour ces filtres.</p>;
  }

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={180}
            tick={{ fontSize: 10 }}
          />
          <Tooltip
            formatter={(value: unknown, _name: unknown, item: unknown) => {
              const payload = (item as { payload?: { max?: number } })?.payload;
              return [`${value} / ${payload?.max ?? ""}`, "Moyenne"];
            }}
          />
          <Bar dataKey="note" fill={ACCENT} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DistributionChart({ distribution }: { distribution: ChoiceDistribution }) {
  const data = distribution.entries
    .filter((e) => e.count > 0)
    .map((e) => ({
      name: e.option.length > 24 ? `${e.option.slice(0, 22)}…` : e.option,
      count: e.count,
    }));

  if (data.length === 0) {
    return <p className="text-sm text-[color:var(--foreground)]/55">Aucune réponse.</p>;
  }

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="name" angle={-30} textAnchor="end" height={56} tick={{ fontSize: 10 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
          <Tooltip />
          <Bar dataKey="count" name="Réponses" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={entry.name} fill={i % 2 === 0 ? ACCENT : "#9e4830"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
