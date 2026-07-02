"use client";

import { useCallback, useEffect, useState } from "react";

const LOCAL_KEY = "v2-idea-votes";

type VoteStore = Record<string, number>;

function read(): VoteStore {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as VoteStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function write(store: VoteStore) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(store));
  } catch {
    /* ignoré */
  }
}

const VOTES_EVENT = "v2-idea-votes-changed";

/** Votes stockés localement (pas de colonne dédiée dans l'API publique des idées). */
export function useIdeaVotes() {
  const [votes, setVotes] = useState<VoteStore>({});

  useEffect(() => {
    setVotes(read());
    const onChange = () => setVotes(read());
    window.addEventListener(VOTES_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(VOTES_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const setVote = useCallback((id: string, delta: number) => {
    setVotes((prev) => {
      const next = { ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) };
      write(next);
      window.dispatchEvent(new Event(VOTES_EVENT));
      return next;
    });
  }, []);

  return { votes, setVote };
}
