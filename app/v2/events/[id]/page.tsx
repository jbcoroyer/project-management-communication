"use client";

import { use } from "react";
import V2AppShell from "../../../../components/v2/AppShell";
import EventDetailWorkspace from "../../../../components/events/EventDetailWorkspace";
import { useCurrentUser } from "../../../../lib/useCurrentUser";

export default function V2EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useCurrentUser();

  return (
    <V2AppShell
      currentUserName={user?.teamMemberName ?? user?.displayName ?? undefined}
      currentUserEmail={user?.email}
      currentUserAvatarUrl={user?.avatarUrl}
      currentUserJobTitle={user?.jobTitle}
    >
      <EventDetailWorkspace
        eventId={id}
        eventsBasePath="/v2/events"
        kanbanPath="/v2/dashboard/kanban"
        showRetexNav
      />
    </V2AppShell>
  );
}
