"use client";

import EventsHubWorkspace from "../../../../components/events/EventsHubWorkspace";
import { useCurrentUser } from "../../../../lib/useCurrentUser";

export default function V3EventsDashboardPage() {
  const { user } = useCurrentUser();

  return (
    <EventsHubWorkspace
      eventsBasePath="/v3/events"
      kanbanPath="/v3/dashboard/kanban"
      showRetexNav
      defaultAdminName={user?.teamMemberName ?? user?.displayName ?? ""}
    />
  );
}
