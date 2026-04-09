"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "./supabaseBrowser";
import type { StockMovement } from "./stockTypes";

type StockMovementRow = {
  id: string;
  created_at: string;
  item_id: string;
  change_amount: number | null;
  new_quantity: number | null;
  reason: string | null;
  user_name: string | null;
  inventory_items?: {
    name?: string | null;
    category?: string | null;
    item_type?: string | null;
    unit_price?: number | string | null;
  } | null;
  projects?: {
    id?: string;
    name?: string | null;
  } | null;
};

function mapMovementRow(row: StockMovementRow): StockMovement {
  return {
    id: row.id,
    createdAt: row.created_at,
    itemId: row.item_id,
    itemName: row.inventory_items?.name ?? "Article inconnu",
    itemCategory: row.inventory_items?.category ?? null,
    itemType: row.inventory_items?.item_type ?? null,
    unitPrice: Math.max(0, Number(row.inventory_items?.unit_price ?? 0) || 0),
    changeAmount: Number(row.change_amount ?? 0) || 0,
    newQuantity: Math.max(0, Number(row.new_quantity ?? 0) || 0),
    projectId: row.projects?.id ?? null,
    projectName: row.projects?.name ?? null,
    reason: row.reason ?? null,
    userName: row.user_name?.trim() || "Utilisateur inconnu",
  };
}

export function useStockMovements(limit = 500) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMovements = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("stock_movements")
        .select(`
          id,
          created_at,
          item_id,
          change_amount,
          new_quantity,
          reason,
          user_name,
          inventory_items:item_id(name, category, item_type, unit_price),
          projects:project_id(id, name)
        `)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      setMovements(((data ?? []) as StockMovementRow[]).map(mapMovementRow));
    } finally {
      setLoading(false);
    }
  }, [limit, supabase]);

  useEffect(() => {
    void loadMovements().catch(() => {
      setMovements([]);
    });
  }, [loadMovements]);

  useEffect(() => {
    const channel = supabase
      .channel(`stock-movements-${limit}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_movements" }, () => {
        void loadMovements().catch(() => {});
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_items" }, () => {
        void loadMovements().catch(() => {});
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => {
        void loadMovements().catch(() => {});
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit, loadMovements, supabase]);

  return useMemo(
    () => ({
      movements,
      loading,
      loadMovements,
    }),
    [movements, loading, loadMovements],
  );
}
