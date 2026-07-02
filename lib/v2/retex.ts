"use client";

import { useCallback, useEffect, useState } from "react";

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

/** Persistance locale des saisies RETEX par événement. */
export function useRetexInputs(eventId: string | null) {
  const [inputs, setInputs] = useState<RetexInputs>(EMPTY_RETEX);

  useEffect(() => {
    if (!eventId) {
      setInputs(EMPTY_RETEX);
      return;
    }
    setInputs(readStore()[eventId] ?? EMPTY_RETEX);
  }, [eventId]);

  const update = useCallback(
    (patch: Partial<RetexInputs>) => {
      setInputs((prev) => {
        const next = { ...prev, ...patch };
        if (eventId) {
          const store = readStore();
          store[eventId] = next;
          writeStore(store);
        }
        return next;
      });
    },
    [eventId],
  );

  return { inputs, update };
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
