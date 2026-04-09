"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ClipboardList, FolderKanban, RefreshCcw, Search, UserRound } from "lucide-react";
import AppShell from "../../../components/AppShell";
import StockSectionNav from "../../../components/StockSectionNav";
import { useCurrentUser } from "../../../lib/useCurrentUser";
import { useStockMovements } from "../../../lib/useStockMovements";
import { formatCurrency, formatNumber } from "../../../lib/stockUtils";

function formatMovementDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function StockHistoryPage() {
  const { user: currentUser } = useCurrentUser();
  const { movements, loading, loadMovements } = useStockMovements(1000);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMovements = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return movements;
    return movements.filter((movement) =>
      [
        movement.itemName,
        movement.itemType,
        movement.projectName,
        movement.reason,
        movement.userName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [movements, searchQuery]);

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
    <AppShell
      toolbarRight={toolbarRight}
      searchSlot={searchSlot}
      currentUserName={currentUser?.displayName ?? currentUser?.teamMemberName ?? currentUser?.email}
      currentUserEmail={currentUser?.email}
      currentUserAvatarUrl={currentUser?.avatarUrl}
      currentUserJobTitle={currentUser?.jobTitle}
    >
      <section className="space-y-6">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/75">
            <ClipboardList className="h-3.5 w-3.5" />
            Historique stock
          </div>
          <h1 className="ui-heading text-3xl font-semibold text-[var(--foreground)]">Traçabilité des mouvements</h1>
          <p className="mt-2 max-w-3xl text-sm text-[color:var(--foreground)]/65">
            Toutes les entrées et sorties de stock sont listées ici avec la personne, le projet et la raison.
          </p>
        </div>

        <StockSectionNav />

        <div className="ui-surface rounded-[24px] p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/50">
                Derniers mouvements
              </p>
              <p className="mt-1 text-sm text-[color:var(--foreground)]/60">
                {formatNumber(filteredMovements.length)} mouvement(s) affiché(s)
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-12 text-center text-sm text-[color:var(--foreground)]/55">
              Chargement de l&apos;historique...
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-12 text-center text-sm text-[color:var(--foreground)]/55">
              Aucun mouvement enregistré pour le moment.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMovements.map((movement) => {
                const isOutput = movement.changeAmount < 0;
                const totalValue = Math.abs(movement.changeAmount) * movement.unitPrice;
                return (
                  <article
                    key={movement.id}
                    className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={[
                              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
                              isOutput
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700",
                            ].join(" ")}
                          >
                            {isOutput ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
                            {isOutput ? "Sortie" : "Entrée"}
                          </span>
                          <h2 className="text-lg font-semibold text-[var(--foreground)]">{movement.itemName}</h2>
                          {movement.itemType && (
                            <span className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-2.5 py-1 text-xs font-semibold text-[color:var(--foreground)]/65">
                              {movement.itemType}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[color:var(--foreground)]/60">
                          <span className="font-semibold text-[var(--foreground)]">
                            {movement.changeAmount > 0 ? "+" : ""}
                            {formatNumber(movement.changeAmount)}
                          </span>
                          <span>Qté après mouvement : {formatNumber(movement.newQuantity)}</span>
                          <span>Valeur : {formatCurrency(totalValue)}</span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[color:var(--foreground)]/60">
                          <span className="inline-flex items-center gap-1.5">
                            <UserRound className="h-4 w-4" />
                            {movement.userName}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <FolderKanban className="h-4 w-4" />
                            {movement.projectName ?? "Autre / Aucun projet"}
                          </span>
                          <span>{formatMovementDate(movement.createdAt)}</span>
                        </div>

                        {movement.reason && (
                          <p className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm text-[color:var(--foreground)]/70">
                            {movement.reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
