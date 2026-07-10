"use client";

import type { ReactNode } from "react";
import { AppVersionProvider } from "../lib/appVersionContext";
import { CurrentUserProvider } from "../lib/currentUserContext";
import { IdenaMarkProvider } from "../lib/idenaMarkContext";
import { InAppNotificationProvider } from "../lib/inAppNotificationsContext";
import { AdminAvatarProvider } from "../lib/adminAvatarContext";
import { ReferenceDataProvider } from "../lib/referenceDataContext";
import { TasksProvider } from "../lib/tasksContext";
import { ConfirmDialogProvider } from "./ui/ConfirmDialog";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <CurrentUserProvider>
      <ReferenceDataProvider>
        <AdminAvatarProvider>
          <TasksProvider>
          <IdenaMarkProvider>
            <AppVersionProvider>
              <ConfirmDialogProvider>
                <InAppNotificationProvider>{children}</InAppNotificationProvider>
              </ConfirmDialogProvider>
            </AppVersionProvider>
          </IdenaMarkProvider>
          </TasksProvider>
        </AdminAvatarProvider>
      </ReferenceDataProvider>
    </CurrentUserProvider>
  );
}
