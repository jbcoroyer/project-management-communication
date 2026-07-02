"use client";

import { useCallback, useEffect, useState } from "react";

export type SavedView = {
  id: string;
  name: string;
  query: string;
  domain: string | null;
  company: string | null;
  priority: string | null;
  assignee: string | null;
};

const LOCAL_KEY = "v2-saved-views";

function read(): SavedView[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedView[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list: SavedView[]) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
  } catch {
    /* ignoré */
  }
}

export function useSavedViews() {
  const [views, setViews] = useState<SavedView[]>([]);

  useEffect(() => {
    setViews(read());
  }, []);

  const add = useCallback((view: Omit<SavedView, "id">) => {
    setViews((prev) => {
      const next = [...prev, { ...view, id: globalThis.crypto?.randomUUID?.() ?? `view-${Date.now()}` }];
      write(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setViews((prev) => {
      const next = prev.filter((v) => v.id !== id);
      write(next);
      return next;
    });
  }, []);

  return { views, add, remove };
}

/** Construit une chaîne de recherche à partir d'une vue (compatible avec le champ `q` du dashboard). */
export function viewToQuery(view: SavedView): string {
  return [view.query, view.domain, view.company, view.priority, view.assignee]
    .filter((v): v is string => Boolean(v && v.trim()))
    .join(" ")
    .trim();
}
