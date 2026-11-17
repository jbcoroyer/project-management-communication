"use client";

import type { ReactNode } from "react";
import { AppVersionProvider } from "../lib/appVersionContext";
import { CurrentUserProvider } from "../lib/currentUserContext";
import { IdenaMarkProvider } from "../lib/idenaMarkContext";
import { InAppNotificationProvider } from "../lib/inAppNotificationsContext";
import { AdminAvatarProvider } from "../lib/adminAvatarContext";
import { ReferenceDataProvider } from "../lib/referenceDataContext";
import { TasksProvider } from "../lib/tasksContext";
import { WorkspaceProvider } from "../lib/workspaceContext";
import { ServicesProvider } from "../lib/servicesContext";
import { BoardsProvider } from "../lib/boardsContext";
import { ActiveBoardProvider } from "../lib/activeBoardContext";
import { ConfirmDialogProvider } from "./ui/ConfirmDialog";
import ModulesOnboardingGate from "./ModulesOnboardingGate";
import DesktopChrome from "./DesktopChrome";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <CurrentUserProvider>
      <DesktopChrome />
      <WorkspaceProvider>
        <ServicesProvider>
          <BoardsProvider>
            <ActiveBoardProvider>
              <ModulesOnboardingGate>
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
              </ModulesOnboardingGate>
            </ActiveBoardProvider>
          </BoardsProvider>
        </ServicesProvider>
      </WorkspaceProvider>
    </CurrentUserProvider>
  );
}
