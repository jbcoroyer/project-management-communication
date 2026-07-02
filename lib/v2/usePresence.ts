"use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "../supabaseBrowser";

export type PresenceMember = {
  key: string;
  name: string;
  avatarUrl: string | null;
  at: number;
};

type PresenceIdentity = {
  id?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
};

/**
 * Présence temps réel « qui regarde » via Supabase Realtime Presence.
 * Renvoie la liste des autres membres présents sur la même zone (`area`).
 */
export function usePresence(area: string, identity: PresenceIdentity): PresenceMember[] {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [members, setMembers] = useState<PresenceMember[]>([]);

  const selfKey = identity.id ?? null;
  const selfName = identity.name ?? "Invité";
  const selfAvatar = identity.avatarUrl ?? null;

  useEffect(() => {
    if (!selfKey) return;

    const channel = supabase.channel(`presence:${area}`, {
      config: { presence: { key: selfKey } },
    });

    type PresenceMeta = { name?: string; avatarUrl?: string | null; at?: number };

    const syncMembers = () => {
      const state = channel.presenceState() as Record<string, PresenceMeta[]>;
      const seen = new Map<string, PresenceMember>();
      for (const [key, metas] of Object.entries(state)) {
        if (key === selfKey) continue;
        const meta = metas[metas.length - 1];
        if (!meta) continue;
        seen.set(key, {
          key,
          name: meta.name ?? "Invité",
          avatarUrl: meta.avatarUrl ?? null,
          at: meta.at ?? Date.now(),
        });
      }
      setMembers(Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name, "fr")));
    };

    channel
      .on("presence", { event: "sync" }, syncMembers)
      .on("presence", { event: "join" }, syncMembers)
      .on("presence", { event: "leave" }, syncMembers)
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ name: selfName, avatarUrl: selfAvatar, at: Date.now() });
        }
      });

    return () => {
      void channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [supabase, area, selfKey, selfName, selfAvatar]);

  return members;
}
