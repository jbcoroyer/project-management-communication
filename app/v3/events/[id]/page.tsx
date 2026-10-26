"use client";

import { use } from "react";
import EventDetailWorkspace from "../../../../components/events/EventDetailWorkspace";

export default function V3EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <EventDetailWorkspace
      eventId={id}
      eventsBasePath="/v3/events"
      kanbanPath="/v3/dashboard/kanban"
      showRetexNav
    />
  );
}
