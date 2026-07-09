"use client";

import { use } from "react";
import EventDetailWorkspace from "../../../../components/events/EventDetailWorkspace";

export default function V2EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <EventDetailWorkspace
      eventId={id}
      eventsBasePath="/v2/events"
      kanbanPath="/v2/dashboard/kanban"
      showRetexNav
    />
  );
}
