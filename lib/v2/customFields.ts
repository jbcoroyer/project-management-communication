"use client";

import { useCallback, useEffect, useState } from "react";

export type CustomFieldType = "text" | "number" | "select" | "date";

export type CustomFieldDef = {
  id: string;
  name: string;
  type: CustomFieldType;
  options: string[]; // pour type select
};

const DEFS_KEY = "v2-custom-field-defs";
const VALUES_KEY = "v2-custom-field-values";

type ValueStore = Record<string, Record<string, string>>; // taskId -> fieldId -> value

function readDefs(): CustomFieldDef[] {
  try {
    const raw = window.localStorage.getItem(DEFS_KEY);
    const parsed = raw ? (JSON.parse(raw) as CustomFieldDef[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeDefs(list: CustomFieldDef[]) {
  try {
    window.localStorage.setItem(DEFS_KEY, JSON.stringify(list));
  } catch {
    /* ignoré */
  }
}

function readValues(): ValueStore {
  try {
    const raw = window.localStorage.getItem(VALUES_KEY);
    const parsed = raw ? (JSON.parse(raw) as ValueStore) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeValues(store: ValueStore) {
  try {
    window.localStorage.setItem(VALUES_KEY, JSON.stringify(store));
  } catch {
    /* ignoré */
  }
}

export function useCustomFields() {
  const [defs, setDefs] = useState<CustomFieldDef[]>([]);
  const [values, setValues] = useState<ValueStore>({});

  useEffect(() => {
    setDefs(readDefs());
    setValues(readValues());
  }, []);

  const addDef = useCallback((def: Omit<CustomFieldDef, "id">) => {
    setDefs((prev) => {
      const next = [...prev, { ...def, id: globalThis.crypto?.randomUUID?.() ?? `cf-${Date.now()}` }];
      writeDefs(next);
      return next;
    });
  }, []);

  const removeDef = useCallback((id: string) => {
    setDefs((prev) => {
      const next = prev.filter((d) => d.id !== id);
      writeDefs(next);
      return next;
    });
  }, []);

  const setValue = useCallback((taskId: string, fieldId: string, value: string) => {
    setValues((prev) => {
      const next: ValueStore = { ...prev, [taskId]: { ...(prev[taskId] ?? {}), [fieldId]: value } };
      writeValues(next);
      return next;
    });
  }, []);

  const getValue = useCallback(
    (taskId: string, fieldId: string): string => values[taskId]?.[fieldId] ?? "",
    [values],
  );

  return { defs, values, addDef, removeDef, setValue, getValue };
}
