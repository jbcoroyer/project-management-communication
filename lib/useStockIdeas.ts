"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "./supabaseBrowser";
import { ideaToClient, type StockIdeaDto } from "./stockIdeasApi";
import type { StockIdea } from "./stockIdeasTypes";
import { toastError } from "./toast";

export type { StockIdea, StockIdeaCategory, StockIdeaStatus } from "./stockIdeasTypes";

const PUBLIC_IDEAS_API = "/api/public/ideas";
const POLL_MS = 12_000;

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : res.statusText);
  }
  return data;
}

export function useStockIdeas() {
  const [ideas, setIdeas] = useState<StockIdea[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(PUBLIC_IDEAS_API, { cache: "no-store" });
      const rows = await parseJson<StockIdeaDto[]>(res);
      setIdeas(rows.map(ideaToClient));
    } catch (e) {
      console.warn("[StockIdeas] load:", e);
      toastError("Impossible de charger les idées.");
      setIdeas([]);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setCanManage(Boolean(data.session));
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setCanManage(Boolean(session));
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(interval);
  }, [load]);

  const addIdea = useCallback(
    (draft: Omit<StockIdea, "id" | "createdAt">) => {
      void (async () => {
        try {
          const res = await fetch(PUBLIC_IDEAS_API, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: draft.title,
              description: draft.description,
              category: draft.category,
            }),
          });
          const created = await parseJson<StockIdeaDto>(res);
          setIdeas((prev) => [ideaToClient(created), ...prev].slice(0, 500));
        } catch (e) {
          console.warn("[StockIdeas] add:", e);
          toastError("Impossible d'ajouter l'idée.");
        }
      })();
    },
    [],
  );

  const updateIdea = useCallback(
    (id: string, patch: Partial<Pick<StockIdea, "title" | "description" | "category" | "status">>) => {
      void (async () => {
        try {
          const res = await fetch(`${PUBLIC_IDEAS_API}/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          });
          const updated = await parseJson<StockIdeaDto>(res);
          setIdeas((prev) => prev.map((i) => (i.id === id ? ideaToClient(updated) : i)));
        } catch (e) {
          console.warn("[StockIdeas] update:", e);
          toastError("Modification impossible. Connectez-vous pour gérer les idées.");
        }
      })();
    },
    [],
  );

  const removeIdea = useCallback((id: string) => {
    void (async () => {
      try {
        const res = await fetch(`${PUBLIC_IDEAS_API}/${id}`, { method: "DELETE" });
        if (!res.ok && res.status !== 204) {
          await parseJson(res);
        }
        setIdeas((prev) => prev.filter((i) => i.id !== id));
      } catch (e) {
        console.warn("[StockIdeas] remove:", e);
        toastError("Suppression impossible. Connectez-vous pour gérer les idées.");
      }
    })();
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
      canManage,
      addIdea,
      updateIdea,
      removeIdea,
      exportJson,
      reload: load,
    }),
    [ideas, hydrated, canManage, addIdea, updateIdea, removeIdea, exportJson, load],
  );
}
