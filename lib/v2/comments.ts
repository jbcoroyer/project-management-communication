"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "../supabaseBrowser";

export type EntityComment = {
  id: string;
  channelKey: string;
  authorId: string | null;
  authorName: string;
  text: string;
  mentions: string[];
  createdAt: string;
};

function localKey(channelKey: string): string {
  return `v2-comments:${channelKey}`;
}

function read(channelKey: string): EntityComment[] {
  try {
    const raw = window.localStorage.getItem(localKey(channelKey));
    const parsed = raw ? (JSON.parse(raw) as EntityComment[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(channelKey: string, list: EntityComment[]) {
  try {
    window.localStorage.setItem(localKey(channelKey), JSON.stringify(list));
  } catch {
    /* ignoré */
  }
}

/** Extrait les @mentions d'un texte (jusqu'à 40 caractères, mots/espaces). */
export function extractMentions(text: string, knownNames: string[]): string[] {
  const found = new Set<string>();
  for (const name of knownNames) {
    const re = new RegExp(`@${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
    if (re.test(text)) found.add(name);
  }
  return Array.from(found);
}

/**
 * Fil de commentaires temps réel par entité.
 * Persistance locale + diffusion temps réel via Supabase Broadcast (recommandé à l'échelle,
 * plutôt que Postgres Changes qui est mono-thread).
 */
export function useEntityComments(
  channelKey: string,
  currentUser: { id: string | null; name: string },
  knownNames: string[] = [],
) {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [comments, setComments] = useState<EntityComment[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    setComments(read(channelKey));
  }, [channelKey]);

  useEffect(() => {
    const channel = supabase.channel(`v2-comments-${channelKey}`, {
      config: { broadcast: { self: false } },
    });
    channel
      .on("broadcast", { event: "comment" }, (payload: { payload?: EntityComment }) => {
        const incoming = payload.payload;
        if (!incoming) return;
        setComments((prev) => {
          if (prev.some((c) => c.id === incoming.id)) return prev;
          const next = [...prev, incoming].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
          write(channelKey, next);
          return next;
        });
      })
      .subscribe();
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [channelKey, supabase]);

  const post = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const comment: EntityComment = {
        id: globalThis.crypto?.randomUUID?.() ?? `c-${Date.now()}`,
        channelKey,
        authorId: currentUser.id,
        authorName: currentUser.name,
        text: trimmed,
        mentions: extractMentions(trimmed, knownNames),
        createdAt: new Date().toISOString(),
      };
      setComments((prev) => {
        const next = [...prev, comment];
        write(channelKey, next);
        return next;
      });
      channelRef.current?.send({ type: "broadcast", event: "comment", payload: comment });
    },
    [channelKey, currentUser.id, currentUser.name, knownNames],
  );

  return { comments, post };
}
