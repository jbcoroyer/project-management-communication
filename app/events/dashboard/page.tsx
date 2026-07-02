"use client";

import AppShell from "../../../components/AppShell";
import EventsHubWorkspace from "../../../components/events/EventsHubWorkspace";
import { useCurrentUser } from "../../../lib/useCurrentUser";

export default function EventsDashboardPage() {
  const { user: currentUser } = useCurrentUser();

  return (
    <AppShell
      currentUserName={currentUser?.displayName ?? currentUser?.teamMemberName ?? currentUser?.email}
      currentUserEmail={currentUser?.email}
      currentUserAvatarUrl={currentUser?.avatarUrl}
      currentUserJobTitle={currentUser?.jobTitle}
    >
      <EventsHubWorkspace
        defaultAdminName={currentUser?.teamMemberName ?? currentUser?.displayName ?? ""}
      />
    </AppShell>
  );
}
