"use client";

import { useParams } from "next/navigation";
import AppShell from "../../../components/AppShell";
import EventDetailWorkspace from "../../../components/events/EventDetailWorkspace";
import { useCurrentUser } from "../../../lib/useCurrentUser";

export default function EventDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { user: currentUser } = useCurrentUser();

  return (
    <AppShell
      currentUserName={currentUser?.displayName ?? currentUser?.teamMemberName ?? currentUser?.email}
      currentUserEmail={currentUser?.email}
      currentUserAvatarUrl={currentUser?.avatarUrl}
      currentUserJobTitle={currentUser?.jobTitle}
    >
      <EventDetailWorkspace eventId={id} />
    </AppShell>
  );
}
