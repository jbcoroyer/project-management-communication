"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "./supabaseBrowser";
import {
  normalizeInventoryItemType,
  type InventoryCategory,
  type InventoryItem,
  type InventoryItemMutation,
} from "./inventoryTypes";
import type { RecordStockMovementPayload, RecordStockMovementResult } from "./stockTypes";

const INVENTORY_SELECT = [
  "id",
  "created_at",
  "category",
  "item_type",
  "name",
  "quantity",
  "unit_price",
  "alert_threshold",
  "last_quote_info",
  "language",
  "visual_url",
].join(",");

type InventoryRow = {
  id: string;
  created_at: string;
  category: InventoryCategory;
  item_type: string | null;
  name: string | null;
  quantity: number | null;
  unit_price: number | string | null;
  alert_threshold: number | null;
  last_quote_info: string | null;
  language: string | null;
  visual_url: string | null;
};

type RecordStockMovementRow = {
  movement_id: string;
  item_id: string;
  item_name: string;
  previous_quantity: number;
  new_quantity: number;
  alert_threshold: number;
  unit_price: number | string;
  project_id: string | null;
  project_name: string | null;
  event_id: string | null;
  event_name: string | null;
  movement_created_at: string;
};

function mapInventoryRow(row: InventoryRow): InventoryItem {
  const itemType =
    row.category === "Print"
      ? (row.item_type ?? "").trim()
      : normalizeInventoryItemType(row.category, row.item_type ?? "");
  return {
    id: row.id,
    createdAt: row.created_at,
    category: row.category,
    itemType,
    language: row.category === "Print" ? (row.language?.trim() || null) : null,
    name: row.name ?? "",
    quantity: Math.max(0, Number(row.quantity ?? 0) || 0),
    unitPrice: Math.max(0, Number(row.unit_price ?? 0) || 0),
    alertThreshold: Math.max(0, Number(row.alert_threshold ?? 0) || 0),
    lastQuoteInfo: row.last_quote_info ?? null,
    visualUrl: row.visual_url ?? null,
  };
}

function normalizeMutation(payload: InventoryItemMutation) {
  const itemType =
    payload.category === "Print"
      ? payload.itemType.trim()
      : normalizeInventoryItemType(payload.category, payload.itemType);
  return {
    category: payload.category,
    item_type: itemType,
    name: payload.name.trim(),
    quantity: Math.max(0, Math.round(payload.quantity || 0)),
    unit_price: Math.max(0, Number(payload.unitPrice || 0)),
    alert_threshold: Math.max(0, Math.round(payload.alertThreshold || 0)),
    language: payload.category === "Print" ? (payload.language?.trim() || null) : null,
    visual_url: payload.visualUrl?.trim() || null,
  };
}

export function getInventoryErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const candidate = error as { message?: string; details?: string; hint?: string };
    const parts = [candidate.message, candidate.details, candidate.hint].filter(
      (value): value is string => Boolean(value && value.trim()),
    );
    if (parts.length > 0) return parts.join(" ");
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export function useInventory() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const itemsRef = useRef<InventoryItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const sortKey = useCallback((a: InventoryItem, b: InventoryItem) => {
    const c = a.category.localeCompare(b.category);
    if (c !== 0) return c;
    if (a.category === "Print") {
      const d = a.itemType.localeCompare(b.itemType, "fr");
      if (d !== 0) return d;
      const la = a.language ?? "";
      const lb = b.language ?? "";
      const ld = la.localeCompare(lb, "fr");
      if (ld !== 0) return ld;
    }
    return a.name.localeCompare(b.name, "fr");
  }, []);

  const upsertItem = useCallback(
    (nextItem: InventoryItem) => {
      setItems((prev) => {
        const index = prev.findIndex((item) => item.id === nextItem.id);
        if (index === -1) {
          return [...prev, nextItem].sort(sortKey);
        }
        const next = [...prev];
        next[index] = nextItem;
        return next.sort(sortKey);
      });
    },
    [sortKey],
  );

  const loadItemById = useCallback(
    async (id: string) => {
      const { data, error } = await supabase.from("inventory_items").select(INVENTORY_SELECT).eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        return null;
      }
      const mapped = mapInventoryRow(data as InventoryRow);
      upsertItem(mapped);
      return mapped;
    },
    [supabase, upsertItem],
  );

  const notifyLowStock = useCallback(async (itemName: string, remainingQty: number, alertThreshold: number) => {
    if (remainingQty > alertThreshold) return;
    await fetch("/api/stock/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemName,
        remainingQty,
        alertThreshold,
      }),
    }).catch(() => undefined);
  }, []);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("inventory_items")
        .select(INVENTORY_SELECT)
        .order("category", { ascending: true })
        .order("name", { ascending: true });
      if (error) {
        throw error;
      }
      setItems(((data ?? []) as InventoryRow[]).map(mapInventoryRow));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let active = true;
    void loadItems().catch(() => {
      if (!active) return;
      setItems([]);
    });
    return () => {
      active = false;
    };
  }, [loadItems]);

  useEffect(() => {
    const channel = supabase
      .channel("inventory-items-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_items" },
        (payload: { eventType?: string; old?: { id?: string }; new?: unknown }) => {
          if (payload.eventType === "DELETE") {
            const deletedId = payload.old?.id as string | undefined;
            if (!deletedId) return;
            setItems((prev) => prev.filter((item) => item.id !== deletedId));
            return;
          }

          const rowId =
            typeof payload.new === "object" && payload.new !== null && "id" in payload.new
              ? String((payload.new as { id?: string }).id ?? "")
              : "";
          if (!rowId) return;
          void loadItemById(rowId).catch(() => {});
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadItemById, supabase]);

  const createItem = useCallback(
    async (payload: InventoryItemMutation) => {
      const { data, error } = await supabase
        .from("inventory_items")
        .insert(normalizeMutation(payload))
        .select(INVENTORY_SELECT)
        .single();
      if (error) throw error;
      const mapped = mapInventoryRow(data as InventoryRow);
      upsertItem(mapped);
      await notifyLowStock(mapped.name, mapped.quantity, mapped.alertThreshold);
    },
    [notifyLowStock, supabase, upsertItem],
  );

  const updateItem = useCallback(
    async (id: string, payload: InventoryItemMutation) => {
      const { data, error } = await supabase
        .from("inventory_items")
        .update(normalizeMutation(payload))
        .select(INVENTORY_SELECT)
        .eq("id", id);
      if (error) throw error;
      const updated = (data?.[0] ?? null) as InventoryRow | null;
      if (updated) {
        const mapped = mapInventoryRow(updated);
        upsertItem(mapped);
        await notifyLowStock(mapped.name, mapped.quantity, mapped.alertThreshold);
      } else {
        const loaded = await loadItemById(id);
        if (loaded) {
          await notifyLowStock(loaded.name, loaded.quantity, loaded.alertThreshold);
        }
      }
    },
    [loadItemById, notifyLowStock, supabase, upsertItem],
  );

  const updateLastQuoteInfo = useCallback(
    async (id: string, value: string) => {
      const { error } = await supabase
        .from("inventory_items")
        .update({ last_quote_info: value.trim() || null })
        .eq("id", id);
      if (error) throw error;
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, lastQuoteInfo: value.trim() || null } : item)),
      );
    },
    [supabase],
  );

  const recordMovement = useCallback(
    async (payload: RecordStockMovementPayload): Promise<RecordStockMovementResult> => {
      const current = itemsRef.current.find((item) => item.id === payload.itemId);
      const { data, error } = await supabase.rpc("record_stock_movement", {
        p_item_id: payload.itemId,
        p_change_amount: payload.changeAmount,
        p_project_id: payload.projectId ?? null,
        p_reason: payload.reason ?? null,
        p_user_name: payload.userName ?? null,
        p_event_id: payload.eventId ?? null,
      });
      if (error) throw error;

      const row = Array.isArray(data) ? (data[0] as RecordStockMovementRow | undefined) : undefined;
      if (!row) {
        throw new Error("Aucun résultat retourné après le mouvement de stock.");
      }

      if (current) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === payload.itemId
              ? { ...item, quantity: Math.max(0, Number(row.new_quantity ?? item.quantity) || item.quantity) }
              : item,
          ),
        );
      } else {
        await loadItemById(payload.itemId);
      }

      await notifyLowStock(row.item_name, row.new_quantity, row.alert_threshold);

      return {
        movementId: row.movement_id,
        itemId: row.item_id,
        itemName: row.item_name,
        previousQuantity: Math.max(0, Number(row.previous_quantity ?? current?.quantity ?? 0) || 0),
        newQuantity: Math.max(0, Number(row.new_quantity ?? 0) || 0),
        alertThreshold: Math.max(0, Number(row.alert_threshold ?? current?.alertThreshold ?? 0) || 0),
        unitPrice: Math.max(0, Number(row.unit_price ?? current?.unitPrice ?? 0) || 0),
        projectId: row.project_id ?? null,
        projectName: row.project_name ?? null,
        eventId: row.event_id ?? null,
        eventName: row.event_name ?? null,
        movementCreatedAt: row.movement_created_at,
      };
    },
    [loadItemById, notifyLowStock, supabase],
  );

  const adjustQuantity = useCallback(
    async (id: string, delta: number) => {
      const current = itemsRef.current.find((item) => item.id === id);
      if (!current) return;
      await recordMovement({
        itemId: id,
        changeAmount: delta,
        userName: "Utilisateur inconnu",
        reason: delta > 0 ? "Ajustement manuel" : "Sortie de stock",
      });
    },
    [recordMovement],
  );

  const deleteItem = useCallback(async (id: string) => {
    const { error } = await supabase.from("inventory_items").delete().eq("id", id);
    if (error) throw error;
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, [supabase]);

  return useMemo(
    () => ({
      items,
      loading,
      loadItems,
      createItem,
      updateItem,
      updateLastQuoteInfo,
      recordMovement,
      adjustQuantity,
      deleteItem,
    }),
    [items, loading, loadItems, createItem, updateItem, updateLastQuoteInfo, recordMovement, adjustQuantity, deleteItem],
  );
}
