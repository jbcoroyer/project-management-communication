"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "../supabaseBrowser";

export type RetexInputs = {
  highlights: string;
  improvements: string;
  followUps: string;
};

export const EMPTY_RETEX: RetexInputs = {
  highlights: "",
  improvements: "",
  followUps: "",
};

const LOCAL_KEY = "v2-retex-inputs";

type Store = Record<string, RetexInputs>;

function normalizeInputs(raw: Partial<RetexInputs> | undefined): RetexInputs {
  return {
    highlights: raw?.highlights ?? "",
    improvements: raw?.improvements ?? "",
    followUps: raw?.followUps ?? "",
  };
}

function readStore(): Store {
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Partial<RetexInputs>>;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).map(([id, value]) => [id, normalizeInputs(value)]),
    );
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(store));
  } catch {
    /* ignoré */
  }
}

/** Persistance RETEX par événement (Supabase + repli local). */
export function useRetexInputs(eventId: string | null) {
  const supabase = getSupabaseBrowser();
  const [inputs, setInputs] = useState<RetexInputs>(EMPTY_RETEX);
  const [backend, setBackend] = useState<"supabase" | "local">("local");

  useEffect(() => {
    if (!eventId) {
      setInputs(EMPTY_RETEX);
      return;
    }

    let cancelled = false;
    const load = async () => {
      const { error: probe } = await supabase.from("event_retex").select("event_id").limit(1);
      if (probe) {
        if (!cancelled) {
          setBackend("local");
          setInputs(readStore()[eventId] ?? EMPTY_RETEX);
        }
        return;
      }
      if (!cancelled) setBackend("supabase");
      const { data } = await supabase
        .from("event_retex")
        .select("highlights, improvements, follow_ups")
        .eq("event_id", eventId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setInputs(
          normalizeInputs({
            highlights: data.highlights,
            improvements: data.improvements,
            followUps: data.follow_ups,
          }),
        );
      } else {
        setInputs(EMPTY_RETEX);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [eventId, supabase]);

  const update = useCallback(
    (patch: Partial<RetexInputs>) => {
      setInputs((prev) => {
        const next = { ...prev, ...patch };
        if (!eventId) return next;

        if (backend === "local") {
          const store = readStore();
          store[eventId] = next;
          writeStore(store);
          return next;
        }

        void (async () => {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          await supabase.from("event_retex").upsert({
            event_id: eventId,
            highlights: next.highlights,
            improvements: next.improvements,
            follow_ups: next.followUps,
            updated_at: new Date().toISOString(),
            updated_by: user?.id ?? null,
          });
        })();

        return next;
      });
    },
    [backend, eventId, supabase],
  );

  return { inputs, update, backend };
}

export function buildRetexDraft(input: {
  eventName: string;
  location: string;
  taskProgressPct: number;
  inputs: RetexInputs;
}): string {
  const { inputs } = input;
  const lines = [
    `# RETEX — ${input.eventName}${input.location ? ` (${input.location})` : ""}`,
    "",
    "## Contexte",
    `- Avancement des tâches : ${input.taskProgressPct} %`,
    "",
    "## Points forts",
    inputs.highlights.trim() ? inputs.highlights.trim() : "- …",
    "",
    "## À améliorer",
    inputs.improvements.trim() ? inputs.improvements.trim() : "- …",
    "",
    "## Actions de suivi",
    inputs.followUps.trim() ? inputs.followUps.trim() : "- …",
  ];
  return lines.join("\n");
}
