"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "./supabaseBrowser";

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

const STOCK_IDEA_SELECT = "id, created_at, title, description, category, status";

type StockIdeaRow = {
  id: string;
  created_at: string;
  title: string;
  description: string | null;
  category: StockIdeaCategory;
  status: StockIdeaStatus;
};

function rowToIdea(row: StockIdeaRow): StockIdea {
  return {
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    description: row.description ?? "",
    category: row.category,
    status: row.status,
  };
}

export function useStockIdeas() {
  const [ideas, setIdeas] = useState<StockIdea[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data, error } = await supabase
        .from("stock_ideas")
        .select(STOCK_IDEA_SELECT)
        .order("created_at", { ascending: false })
        .limit(500);

      if (!mounted) return;
      if (error) {
        console.warn("[StockIdeas] load:", error.message);
        setIdeas([]);
        setHydrated(true);
        return;
      }

      setIdeas(((data ?? []) as StockIdeaRow[]).map(rowToIdea));
      setHydrated(true);
    };

    void load();

    const channel = supabase
      .channel("stock_ideas_feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_ideas" }, () => {
        void load();
      })
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  const addIdea = useCallback((draft: Omit<StockIdea, "id" | "createdAt">) => {
    void (async () => {
      const { data, error } = await supabase
        .from("stock_ideas")
        .insert({
          title: draft.title,
          description: draft.description || null,
          category: draft.category,
          status: draft.status,
        })
        .select(STOCK_IDEA_SELECT)
        .single();

      if (error) {
        console.warn("[StockIdeas] add:", error.message);
        return;
      }

      setIdeas((prev) => [rowToIdea(data as StockIdeaRow), ...prev].slice(0, 500));
    })();
  }, [supabase]);

  const updateIdea = useCallback(
    (id: string, patch: Partial<Pick<StockIdea, "title" | "description" | "category" | "status">>) => {
      void (async () => {
        const dbPatch: {
          title?: string;
          description?: string | null;
          category?: StockIdeaCategory;
          status?: StockIdeaStatus;
        } = {};
        if (patch.title !== undefined) dbPatch.title = patch.title;
        if (patch.description !== undefined) dbPatch.description = patch.description || null;
        if (patch.category !== undefined) dbPatch.category = patch.category;
        if (patch.status !== undefined) dbPatch.status = patch.status;

        const { error } = await supabase.from("stock_ideas").update(dbPatch).eq("id", id);
        if (error) {
          console.warn("[StockIdeas] update:", error.message);
          return;
        }

        setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
      })();
    },
    [supabase],
  );

  const removeIdea = useCallback((id: string) => {
    void (async () => {
      const { error } = await supabase.from("stock_ideas").delete().eq("id", id);
      if (error) {
        console.warn("[StockIdeas] remove:", error.message);
        return;
      }
      setIdeas((prev) => prev.filter((i) => i.id !== id));
    })();
  }, [supabase]);

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
