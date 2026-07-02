"use client";

import type { ReactNode } from "react";
import { AppVersionProvider } from "../lib/appVersionContext";
import { IdenaMarkProvider } from "../lib/idenaMarkContext";
import { InAppNotificationProvider } from "../lib/inAppNotificationsContext";
import { ConfirmDialogProvider } from "./ui/ConfirmDialog";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <IdenaMarkProvider>
      <AppVersionProvider>
        <ConfirmDialogProvider>
          <InAppNotificationProvider>
            {children}
          </InAppNotificationProvider>
        </ConfirmDialogProvider>
      </AppVersionProvider>
    </IdenaMarkProvider>
  );
}
