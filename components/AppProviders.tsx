"use client";

import type { ReactNode } from "react";
import { IdenaMarkProvider } from "../lib/idenaMarkContext";
import { InAppNotificationProvider } from "../lib/inAppNotificationsContext";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <IdenaMarkProvider>
      <InAppNotificationProvider>{children}</InAppNotificationProvider>
    </IdenaMarkProvider>
  );
}
