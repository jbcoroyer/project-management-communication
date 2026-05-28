"use client";

import { useEffect } from "react";
import { getSupabaseBrowser } from "./supabaseBrowser";

type SingleTableParams = {
  /** Nom de la table public.* à observer. */
  table: string;
  /** Nom unique du channel Realtime (préférer un nom stable). */
  channelName: string;
  /** Callback déclenché à chaque change. Souvent : `() => void load()`. */
  onChange: () => void;
  /** Désactive temporairement la souscription (par ex. si user pas chargé). */
  enabled?: boolean;
  /** Filtre Realtime optionnel (ex. `column=eq.value`). */
  filter?: string;
};

type MultiTableParams = {
  /** Liste de tables à observer sur un seul channel (gain de connexions). */
  tables: readonly string[];
  channelName: string;
  onChange: () => void;
  enabled?: boolean;
};

/**
 * Hook utilitaire pour s'abonner aux changements Realtime et déclencher
 * un callback de "reload" à chaque INSERT/UPDATE/DELETE.
 *
 * Deux signatures :
 * - `{ table }` pour une seule table (avec filtre optionnel)
 * - `{ tables: [...] }` pour plusieurs tables sur un même channel
 *
 * Pour des merges optimistes (cas tasks/socialPosts/eventTasks), inscrire
 * la souscription manuellement avec un handler typé plutôt que d'utiliser
 * ce hook qui se contente d'un re-fetch.
 *
 * @example
 * useRealtimeReload({
 *   table: "stock_ideas",
 *   channelName: "stock_ideas_feed",
 *   onChange: useCallback(() => void load(), [load]),
 * });
 *
 * @example
 * useRealtimeReload({
 *   tables: ["stock_movements", "inventory_items", "projects"],
 *   channelName: "stock-movements-feed",
 *   onChange: useCallback(() => void load(), [load]),
 * });
 */
export function useRealtimeReload(params: SingleTableParams | MultiTableParams) {
  const { channelName, onChange, enabled = true } = params;
  const tables = "tables" in params ? params.tables : [params.table];
  const tablesKey = tables.join(",");
  const filter = "filter" in params ? params.filter : undefined;

  useEffect(() => {
    if (!enabled) return;
    const supabase = getSupabaseBrowser();
    let channel = supabase.channel(channelName);
    for (const table of tables) {
      channel = channel.on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table, ...(filter ? { filter } : {}) },
        () => {
          onChange();
        },
      );
    }
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // onChange est volontairement omis des deps : on attend une référence stable
    // (callback wrap dans useCallback côté appelant).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, enabled, tablesKey, filter]);
}
