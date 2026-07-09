"use client";

import { Download, RefreshCcw } from "lucide-react";
import StockDashboardWorkspace from "../../../../components/stock/StockDashboardWorkspace";
import { V2ShellSlotSetter } from "../../../../lib/v2/shellSlotsContext";
import { useInventory } from "../../../../lib/useInventory";
import { toastError, toastSuccess } from "../../../../lib/toast";
import { inventoryItemsToCsv } from "../../../../lib/stockUtils";
import { useStockMovements } from "../../../../lib/useStockMovements";

export default function V2StockDashboardPage() {
  const { items, loading: itemsLoading, loadItems } = useInventory();
  const { movements, loading: movementsLoading, loadMovements } = useStockMovements(1000);

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
        className="ui-transition inline-flex items-center gap-1.5 rounded-xl bg-[var(--foreground)] px-3 py-2 text-sm font-semibold text-[var(--accent-contrast)] shadow-sm hover:opacity-90"
      >
        <Download className="h-4 w-4" />
        Exporter l&apos;inventaire en CSV
      </button>
    </div>
  );

  return (
    <>
      <V2ShellSlotSetter toolbarRight={toolbarRight} />
      <StockDashboardWorkspace
        basePath="/v2/stock"
        items={items}
        movements={movements}
        itemsLoading={itemsLoading}
        movementsLoading={movementsLoading}
      />
    </>
  );
}
