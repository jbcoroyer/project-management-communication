"use client";

import { createContext, useContext } from "react";

/** Map nom → URL avatar (null = pas de photo) */
export const AdminAvatarContext = createContext<Record<string, string | null>>({});

export function useAdminAvatarMap() {
  return useContext(AdminAvatarContext);
}
