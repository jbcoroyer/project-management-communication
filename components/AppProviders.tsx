"use client";

import type { ReactNode } from "react";
import { IdenaMarkProvider } from "../lib/idenaMarkContext";

export default function AppProviders({ children }: { children: ReactNode }) {
  return <IdenaMarkProvider>{children}</IdenaMarkProvider>;
}
