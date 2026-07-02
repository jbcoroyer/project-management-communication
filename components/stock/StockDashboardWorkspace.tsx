"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Euro, TrendingDown } from "lucide-react";
import StockSectionNav from "../StockSectionNav";
import type { InventoryItem } from "../../lib/inventoryTypes";
import { inventoryItemValue } from "../../lib/inventoryTypes";
import type { StockMovement } from "../../lib/stockTypes";
import { formatCurrency, formatNumber } from "../../lib/stockUtils";

function isSameMonth(date: Date, reference: Date): boolean {
  return date.getMonth() === reference.getMonth() && date.getFullYear() === reference.getFullYear();
}

type StockDashboardWorkspaceProps = {
  basePath?: string;
  items: InventoryItem[];
  movements: StockMovement[];
  itemsLoading: boolean;
  movementsLoading: boolean;
};

export default function StockDashboardWorkspace({
  basePath = "/stock",
  items,
  movements,
  itemsLoading,
  movementsLoading,
}: StockDashboardWorkspaceProps) {
  const { totalStockValue, monthOutputCost, chartData } = useMemo(() => {
    const now = new Date();
    const totalStockValue = items.reduce((sum, item) => sum + inventoryItemValue(item), 0);
    const monthlyOutputs = movements.filter(
      (movement) => movement.changeAmount < 0 && isSameMonth(new Date(movement.createdAt), now),
    );
    const monthOutputCost = monthlyOutputs.reduce(
      (sum, movement) => sum + Math.abs(movement.changeAmount) * movement.unitPrice,
      0,
    );
    const costByProject = monthlyOutputs.reduce<Record<string, number>>((acc, movement) => {
      const label = movement.projectName ?? "Sans projet";
      acc[label] = (acc[label] ?? 0) + Math.abs(movement.changeAmount) * movement.unitPrice;
      return acc;
    }, {});
    const chartData = Object.entries(costByProject)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      totalStockValue,
      monthOutputCost,
      chartData,
    };
  }, [items, movements]);

  return (
    <section className="space-y-6">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/75">
          <BarChart3 className="h-3.5 w-3.5" />
          Dashboard stock
        </div>
        <h1 className="ui-heading text-3xl font-semibold text-[var(--foreground)]">Pilotage du stock</h1>
        <p className="mt-2 max-w-3xl text-sm text-[color:var(--foreground)]/65">
          Vue synthétique de la valeur immobilisée, des sorties du mois et de la consommation par projet.
        </p>
      </div>

      <StockSectionNav basePath={basePath} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="ui-surface rounded-[24px] p-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--foreground)]/65">
            <Euro className="h-3.5 w-3.5" />
            Valeur totale du stock actuel
          </div>
          <p className="mt-4 text-4xl font-semibold text-[var(--foreground)]">{formatCurrency(totalStockValue)}</p>
          <p className="mt-2 text-sm text-[color:var(--foreground)]/60">
            {formatNumber(items.length)} article(s) suivis.
          </p>
        </div>

        <div className="ui-surface rounded-[24px] p-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--foreground)]/65">
            <TrendingDown className="h-3.5 w-3.5" />
            Coût total des articles sortis ce mois-ci
          </div>
          <p className="mt-4 text-4xl font-semibold text-[var(--foreground)]">{formatCurrency(monthOutputCost)}</p>
          <p className="mt-2 text-sm text-[color:var(--foreground)]/60">
            Basé sur les sorties imputées dans `stock_movements`.
          </p>
        </div>
      </div>

      <div className="ui-surface rounded-[24px] p-5">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/50">
            Valeur consommée par projet
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Répartition des sorties du mois</h2>
        </div>

        {itemsLoading || movementsLoading ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-16 text-center text-sm text-[color:var(--foreground)]/55">
            Chargement du dashboard...
          </div>
        ) : chartData.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-16 text-center text-sm text-[color:var(--foreground)]/55">
            Aucune sortie de stock enregistrée sur le mois en cours.
          </div>
        ) : (
          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "rgba(45,41,38,0.65)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(value: number) => `${Math.round(value)} €`}
                  tick={{ fill: "rgba(45,41,38,0.65)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={90}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(Array.isArray(value) ? value[0] : value ?? 0))}
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid rgba(0,0,0,0.08)",
                    backgroundColor: "rgba(255,255,255,0.97)",
                  }}
                />
                <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="var(--accent)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}
