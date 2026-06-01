"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Package, RotateCcw } from "lucide-react";
import { getSupabaseBrowser } from "../../lib/supabaseBrowser";
import { eventStockKits, resolveKitToInventoryIds } from "../../lib/eventStockKits";
import { useInventory, getInventoryErrorMessage } from "../../lib/useInventory";
import { formatInventorySelectOptionLabel } from "../../lib/stockUtils";
import { toastError, toastSuccess } from "../../lib/toast";

export type MaterialNeedRow = {
  id: string;
  inventoryItemId: string;
  itemName: string;
  quantityNeeded: number;
  quantityFulfilled: number;
  notes: string;
};

type Props = {
  eventId: string;
  defaultUserName: string;
  onStockChanged: () => void;
};

export default function EventMaterialNeeds(props: Props) {
  const { eventId, defaultUserName, onStockChanged } = props;
  const { items, loading: invLoading, recordMovement } = useInventory();
  const [needs, setNeeds] = useState<MaterialNeedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemId, setItemId] = useState("");
  const [qty, setQty] = useState("1");
  const [kitKey, setKitKey] = useState(eventStockKits[0]?.key ?? "");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("event_material_needs")
        .select(
          "id, quantity_needed, quantity_fulfilled, notes, inventory_item_id, inventory_items(name)",
        )
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setNeeds(
        ((data ?? []) as Record<string, unknown>[]).map((row) => {
          const inv = row.inventory_items as { name: string | null } | null;
          return {
            id: String(row.id),
            inventoryItemId: String(row.inventory_item_id),
            itemName: inv?.name ?? "Article",
            quantityNeeded: Number(row.quantity_needed ?? 0) || 0,
            quantityFulfilled: Number(row.quantity_fulfilled ?? 0) || 0,
            notes: String(row.notes ?? ""),
          };
        }),
      );
    } catch (e) {
      toastError(getInventoryErrorMessage(e, "Liste de besoins indisponible."));
      setNeeds([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addNeed = async () => {
    if (!itemId) {
      toastError("Choisissez un article.");
      return;
    }
    const n = Math.max(1, Math.round(Number(qty) || 1));
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.from("event_material_needs").upsert(
      {
        event_id: eventId,
        inventory_item_id: itemId,
        quantity_needed: n,
        notes: "",
      },
      { onConflict: "event_id,inventory_item_id" },
    );
    if (error) {
      toastError(error.message);
      return;
    }
    toastSuccess("Besoin enregistré");
    setItemId("");
    setQty("1");
    await load();
  };

  const applyKit = async () => {
    const kit = eventStockKits.find((k) => k.key === kitKey);
    if (!kit) return;
    const resolved = resolveKitToInventoryIds(
      kit,
      items.map((i) => ({ id: i.id, name: i.name })),
    );
    if (resolved.length === 0) {
      toastError("Aucun article du stock ne correspond à ce kit.");
      return;
    }
    const supabase = getSupabaseBrowser();
    for (const line of resolved) {
      await supabase.from("event_material_needs").upsert(
        {
          event_id: eventId,
          inventory_item_id: line.inventoryItemId,
          quantity_needed: line.quantity,
          notes: `Kit ${kit.label}`,
        },
        { onConflict: "event_id,inventory_item_id" },
      );
    }
    toastSuccess(`Kit « ${kit.label} » appliqué (${resolved.length} ligne(s))`);
    await load();
  };

  const fulfillNeed = async (need: MaterialNeedRow) => {
    const remaining = need.quantityNeeded - need.quantityFulfilled;
    if (remaining <= 0) {
      toastError("Besoin déjà couvert.");
      return;
    }
    const inv = items.find((i) => i.id === need.inventoryItemId);
    if (inv && remaining > inv.quantity) {
      toastError("Stock insuffisant.");
      return;
    }
    setSubmitting(true);
    try {
      await recordMovement({
        itemId: need.inventoryItemId,
        changeAmount: -remaining,
        projectId: null,
        eventId,
        reason: `Salon — ${need.itemName}`,
        userName: defaultUserName,
      });
      const supabase = getSupabaseBrowser();
      await supabase
        .from("event_material_needs")
        .update({ quantity_fulfilled: need.quantityNeeded })
        .eq("id", need.id);
      toastSuccess("Sortie stock enregistrée");
      onStockChanged();
      await load();
    } catch (e) {
      toastError(getInventoryErrorMessage(e, "Sortie impossible."));
    } finally {
      setSubmitting(false);
    }
  };

  const returnToStock = async (need: MaterialNeedRow) => {
    const qtyReturn = need.quantityFulfilled;
    if (qtyReturn <= 0) {
      toastError("Aucune quantité à retourner.");
      return;
    }
    setSubmitting(true);
    try {
      await recordMovement({
        itemId: need.inventoryItemId,
        changeAmount: qtyReturn,
        projectId: null,
        eventId,
        reason: `Retour salon — ${need.itemName}`,
        userName: defaultUserName,
      });
      const supabase = getSupabaseBrowser();
      await supabase
        .from("event_material_needs")
        .update({ quantity_fulfilled: 0 })
        .eq("id", need.id);
      toastSuccess("Retour stock enregistré");
      onStockChanged();
      await load();
    } catch (e) {
      toastError(getInventoryErrorMessage(e, "Retour impossible."));
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = useMemo(
    () => needs.filter((n) => n.quantityFulfilled < n.quantityNeeded).length,
    [needs],
  );

  return (
    <div className="space-y-6">
      <div className="ui-surface rounded-[22px] p-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--foreground)]/65">
          <Package className="h-3.5 w-3.5" />
          Besoins matériel ({pendingCount} en attente)
        </div>
        <p className="mt-3 text-sm text-[color:var(--foreground)]/60">
          Déclarez les besoins avant la sortie stock. Un kit applique plusieurs lignes d&apos;un coup.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <select
            value={kitKey}
            onChange={(e) => setKitKey(e.target.value)}
            className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
          >
            {eventStockKits.map((k) => (
              <option key={k.key} value={k.key}>
                {k.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void applyKit()}
            className="ui-transition rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold"
          >
            Appliquer le kit
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_100px_auto]">
          <select
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            disabled={invLoading}
            className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
          >
            <option value="">Article…</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {formatInventorySelectOptionLabel(i)} ({i.quantity} dispo)
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="ui-focus-ring rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void addNeed()}
            className="rounded-xl bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)]"
          >
            Ajouter
          </button>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-[color:var(--foreground)]/55">Chargement…</p>
        ) : needs.length === 0 ? (
          <p className="mt-4 text-sm text-[color:var(--foreground)]/55">Aucun besoin déclaré.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {needs.map((n) => {
              const ok = n.quantityFulfilled >= n.quantityNeeded;
              return (
                <li
                  key={n.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium">{n.itemName}</span>
                    <span className="ml-2 text-[color:var(--foreground)]/55">
                      {n.quantityFulfilled}/{n.quantityNeeded}
                    </span>
                    {ok ? (
                      <span className="ml-2 text-xs font-semibold text-emerald-700">OK</span>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    {!ok ? (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => void fulfillNeed(n)}
                        className="rounded-lg bg-[var(--foreground)] px-2 py-1 text-xs font-semibold text-[var(--accent-contrast)]"
                      >
                        Sortir stock
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => void returnToStock(n)}
                        className="ui-transition inline-flex items-center gap-1 rounded-lg border border-[var(--line)] px-2 py-1 text-xs font-semibold"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Retour
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
