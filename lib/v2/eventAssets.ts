"use client";

import { useCallback, useEffect, useState } from "react";

export const ASSET_CATEGORIES = ["Stand", "Display", "Collatéral", "Mobilier", "Matériel"] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export type EventAsset = {
  id: string;
  name: string;
  category: AssetCategory;
  location: string;
  quantity: number;
  assignedEventId: string | null;
  notes: string;
};

const LOCAL_KEY = "v2-event-assets";

function read(): EventAsset[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? (JSON.parse(raw) as EventAsset[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list: EventAsset[]) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    /* ignoré */
  }
}

export function useEventAssets() {
  const [assets, setAssets] = useState<EventAsset[]>([]);

  useEffect(() => {
    setAssets(read());
  }, []);

  const add = useCallback((asset: Omit<EventAsset, "id">) => {
    setAssets((prev) => {
      const next = [...prev, { ...asset, id: globalThis.crypto?.randomUUID?.() ?? `asset-${Date.now()}` }];
      write(next);
      return next;
    });
  }, []);

  const update = useCallback((id: string, patch: Partial<EventAsset>) => {
    setAssets((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, ...patch } : a));
      write(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setAssets((prev) => {
      const next = prev.filter((a) => a.id !== id);
      write(next);
      return next;
    });
  }, []);

  return { assets, add, update, remove };
}
