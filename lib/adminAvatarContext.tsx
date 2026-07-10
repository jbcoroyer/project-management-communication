"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useReferenceData } from "./useReferenceData";

/** Map nom collaborateur → URL avatar (null = pas de photo). */
export const AdminAvatarContext = createContext<Record<string, string | null>>({});

export function resolveAdminAvatarUrl(
  map: Record<string, string | null>,
  name: string,
): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const direct = map[trimmed];
  if (direct) return direct;
  const lower = trimmed.toLowerCase();
  for (const [key, url] of Object.entries(map)) {
    if (key.toLowerCase() === lower && url) return url;
  }
  return null;
}

export function AdminAvatarProvider({ children }: { children: ReactNode }) {
  const { admins } = useReferenceData();
  const value = useMemo(
    () => Object.fromEntries(admins.map((record) => [record.name, record.avatarUrl ?? null])),
    [admins],
  );
  return <AdminAvatarContext.Provider value={value}>{children}</AdminAvatarContext.Provider>;
}

export function useAdminAvatarMap() {
  return useContext(AdminAvatarContext);
}
