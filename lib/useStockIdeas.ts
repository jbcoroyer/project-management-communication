"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "idena-stock-ideas-v1";

export type StockIdeaCategory = "materiel" | "process" | "communication" | "autre";
export type StockIdeaStatus = "nouveau" | "etude" | "adopte" | "archive";

export type StockIdea = {
  id: string;
  createdAt: string;
  title: string;
  description: string;
  category: StockIdeaCategory;
  status: StockIdeaStatus;
};

function readStored(): StockIdea[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is StockIdea =>
        x != null &&
        typeof x === "object" &&
        typeof (x as StockIdea).id === "string" &&
        typeof (x as StockIdea).title === "string",
    );
  } catch {
    return [];
  }
}

function writeStored(ideas: StockIdea[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ideas));
}

export function useStockIdeas() {
  const [ideas, setIdeas] = useState<StockIdea[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setIdeas(readStored());
    setHydrated(true);
  }, []);

  const addIdea = useCallback((draft: Omit<StockIdea, "id" | "createdAt">) => {
    const row: StockIdea = {
      ...draft,
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `idea-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setIdeas((prev) => {
      const next = [row, ...prev].slice(0, 500);
      writeStored(next);
      return next;
    });
  }, []);

  const updateIdea = useCallback(
    (id: string, patch: Partial<Pick<StockIdea, "title" | "description" | "category" | "status">>) => {
      setIdeas((prev) => {
        const next = prev.map((i) => (i.id === id ? { ...i, ...patch } : i));
        writeStored(next);
        return next;
      });
    },
    [],
  );

  const removeIdea = useCallback((id: string) => {
    setIdeas((prev) => {
      const next = prev.filter((i) => i.id !== id);
      writeStored(next);
      return next;
    });
  }, []);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(ideas, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `boite-a-idees-stock-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [ideas]);

  return useMemo(
    () => ({
      ideas,
      hydrated,
      addIdea,
      updateIdea,
      removeIdea,
      exportJson,
    }),
    [ideas, hydrated, addIdea, updateIdea, removeIdea, exportJson],
  );
}
