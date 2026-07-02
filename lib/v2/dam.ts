"use client";

import { useCallback, useEffect, useState } from "react";

export const DAM_TYPES = ["Logo", "Visuel", "Template", "Document", "Vidéo", "Autre"] as const;
export type DamType = (typeof DAM_TYPES)[number];

export type DamAsset = {
  id: string;
  name: string;
  url: string;
  company: string;
  type: DamType;
  tags: string[];
  createdAt: string;
};

const LOCAL_KEY = "v2-dam-assets";

function read(): DamAsset[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    const parsed = raw ? (JSON.parse(raw) as DamAsset[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list: DamAsset[]) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    /* ignoré */
  }
}

export function useDamAssets() {
  const [assets, setAssets] = useState<DamAsset[]>([]);

  useEffect(() => {
    setAssets(read());
  }, []);

  const add = useCallback((asset: Omit<DamAsset, "id" | "createdAt">) => {
    setAssets((prev) => {
      const next = [
        { ...asset, id: globalThis.crypto?.randomUUID?.() ?? `dam-${Date.now()}`, createdAt: new Date().toISOString() },
        ...prev,
      ];
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

  return { assets, add, remove };
}

/** Recherche simple par mot-clé sur nom, tags, société et type. */
export function searchAssets(assets: DamAsset[], query: string): DamAsset[] {
  const q = query.trim().toLowerCase();
  if (!q) return assets;
  const terms = q.split(/\s+/);
  return assets.filter((a) => {
    const haystack = [a.name, a.company, a.type, ...a.tags].join(" ").toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
}
