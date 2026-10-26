"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "../supabaseBrowser";

const LOCAL_KEY = "v2-idea-votes";
const VOTES_EVENT = "v2-idea-votes-changed";

type VoteStore = Record<string, number>;

function readLocal(): VoteStore {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as VoteStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLocal(store: VoteStore) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(store));
  } catch {
    /* ignoré */
  }
}

/** Votes partagés en base (1 vote / user / idée) avec repli localStorage. */
export function useIdeaVotes() {
  const supabase = getSupabaseBrowser();
  const [votes, setVotes] = useState<VoteStore>({});
  const [backend, setBackend] = useState<"supabase" | "local">("local");
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());

  const reload = useCallback(async () => {
    const { error: probe } = await supabase.from("idea_votes").select("idea_id").limit(1);
    if (probe) {
      setBackend("local");
      setVotes(readLocal());
      return;
    }
    setBackend("supabase");
    const { data } = await supabase.from("idea_votes").select("idea_id, user_id");
    const counts: VoteStore = {};
    const mine = new Set<string>();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    for (const row of data ?? []) {
      const ideaId = String(row.idea_id);
      counts[ideaId] = (counts[ideaId] ?? 0) + 1;
      if (user && row.user_id === user.id) mine.add(ideaId);
    }
    setVotes(counts);
    setMyVotes(mine);
  }, [supabase]);

  useEffect(() => {
    void reload();
    const onChange = () => {
      if (backend === "local") setVotes(readLocal());
      else void reload();
    };
    window.addEventListener(VOTES_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(VOTES_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, [backend, reload]);

  const setVote = useCallback(
    async (id: string, delta: number) => {
      if (backend === "local") {
        setVotes((prev) => {
          const next = { ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) };
          writeLocal(next);
          window.dispatchEvent(new Event(VOTES_EVENT));
          return next;
        });
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      if (delta > 0) {
        if (myVotes.has(id)) return;
        const { error } = await supabase.from("idea_votes").insert({ idea_id: id, user_id: user.id });
        if (error && error.code !== "23505") return;
        setMyVotes((prev) => new Set(prev).add(id));
        setVotes((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
      } else if (delta < 0) {
        if (!myVotes.has(id)) return;
        await supabase.from("idea_votes").delete().eq("idea_id", id).eq("user_id", user.id);
        setMyVotes((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setVotes((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) - 1) }));
      }
      window.dispatchEvent(new Event(VOTES_EVENT));
    },
    [backend, myVotes, supabase],
  );

  return { votes, setVote, myVotes, backend };
}
