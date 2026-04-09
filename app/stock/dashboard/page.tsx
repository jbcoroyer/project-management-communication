"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Download, Euro, RefreshCcw, TrendingDown } from "lucide-react";
import AppShell from "../../../components/AppShell";
import StockSectionNav from "../../../components/StockSectionNav";
import { inventoryItemValue } from "../../../lib/inventoryTypes";
import { useCurrentUser } from "../../../lib/useCurrentUser";
import { useInventory } from "../../../lib/useInventory";
import { toastError, toastSuccess } from "../../../lib/toast";
import { inventoryItemsToCsv, formatCurrency, formatNumber } from "../../../lib/stockUtils";
import { useStockMovements } from "../../../lib/useStockMovements";

function isSameMonth(date: Date, reference: Date): boolean {
  return date.getMonth() === reference.getMonth() && date.getFullYear() === reference.getFullYear();
}

export default function StockDashboardPage() {
  const { user: currentUser } = useCurrentUser();
  const { items, loading: itemsLoading, loadItems } = useInventory();
  const { movements, loading: movementsLoading, loadMovements } = useStockMovements(1000);

  const { totalStockValue, monthOutputCost, chartData } = useMemo(() => {
    const now = new Date();
    const totalStockValue = items.reduce((sum, item) => sum + inventoryItemValue(item), 0);
    const monthlyOutputs = movements.filter((movement) => movement.changeAmount < 0 && isSameMonth(new Date(movement.createdAt), now));
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

  const toolbarRight = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => {
          void Promise.all([loadItems().catch(() => undefined), loadMovements().catch(() => undefined)]);
        }}
        className="ui-transition inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
      >
        <RefreshCcw className="h-4 w-4" />
        Actualiser
      </button>
      <button
        type="button"
        onClick={() => {
          try {
            const csv = inventoryItemsToCsv(items);
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `inventaire-stock-${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            toastSuccess("Export CSV généré");
          } catch {
            toastError("Impossible d'exporter l'inventaire.");
          }
        }}
        className="ui-transition inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#fffdf9] shadow-sm hover:bg-[var(--accent-strong)]"
      >
        <Download className="h-4 w-4" />
        Exporter l&apos;inventaire en CSV
      </button>
    </div>
  );

  return (
    <AppShell
      toolbarRight={toolbarRight}
      currentUserName={currentUser?.displayName ?? currentUser?.teamMemberName ?? currentUser?.email}
      currentUserEmail={currentUser?.email}
      currentUserAvatarUrl={currentUser?.avatarUrl}
      currentUserJobTitle={currentUser?.jobTitle}
    >
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

        <StockSectionNav />

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
    </AppShell>
  );
}
