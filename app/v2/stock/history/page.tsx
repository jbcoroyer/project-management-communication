"use client";

import { useState } from "react";
import { RefreshCcw, Search } from "lucide-react";
import StockHistoryWorkspace from "../../../../components/stock/StockHistoryWorkspace";
import { V2ShellSlotSetter } from "../../../../lib/v2/shellSlotsContext";
import { useStockMovements } from "../../../../lib/useStockMovements";

export default function V2StockHistoryPage() {
  const { movements, loading, loadMovements } = useStockMovements(1000);
  const [searchQuery, setSearchQuery] = useState("");

  const searchSlot = (
    <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
      <Search className="h-4 w-4 text-[color:var(--foreground)]/45" />
      <input
        type="text"
        placeholder="Rechercher un article, un projet, une personne..."
        aria-label="Recherche historique stock"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        className="ui-focus-ring w-full rounded-md bg-transparent text-sm text-[var(--foreground)] placeholder:text-[color:var(--foreground)]/45 focus:outline-none"
      />
    </div>
  );

  const toolbarRight = (
    <button
      type="button"
      onClick={() => void loadMovements().catch(() => undefined)}
      className="ui-transition inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
    >
      <RefreshCcw className="h-4 w-4" />
      Actualiser
    </button>
  );

  return (
    <>
      <V2ShellSlotSetter toolbarRight={toolbarRight} searchSlot={searchSlot} />
      <StockHistoryWorkspace
        basePath="/v2/stock"
        movements={movements}
        loading={loading}
        searchQuery={searchQuery}
      />
    </>
  );
}
