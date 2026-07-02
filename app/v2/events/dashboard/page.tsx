"use client";

import V2AppShell from "../../../../components/v2/AppShell";
import EventsHubWorkspace from "../../../../components/events/EventsHubWorkspace";
import { useCurrentUser } from "../../../../lib/useCurrentUser";

export default function V2EventsDashboardPage() {
  const { user } = useCurrentUser();

  return (
    <V2AppShell
      currentUserName={user?.teamMemberName ?? user?.displayName ?? undefined}
      currentUserEmail={user?.email}
      currentUserAvatarUrl={user?.avatarUrl}
      currentUserJobTitle={user?.jobTitle}
    >
      <EventsHubWorkspace
        eventsBasePath="/v2/events"
        kanbanPath="/v2/dashboard/kanban"
        showRetexNav
        defaultAdminName={user?.teamMemberName ?? user?.displayName ?? ""}
      />
    </V2AppShell>
  );
}
