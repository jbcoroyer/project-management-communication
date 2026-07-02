"use client";

import V2AppShell from "../../../components/v2/AppShell";
import AskForm from "../../../components/v2/AskForm";
import { useCurrentUser } from "../../../lib/useCurrentUser";

export default function V2AsksPage() {
  const { user } = useCurrentUser();

  return (
    <V2AppShell
      currentUserName={user?.teamMemberName ?? user?.displayName ?? undefined}
      currentUserEmail={user?.email}
      currentUserAvatarUrl={user?.avatarUrl}
      currentUserJobTitle={user?.jobTitle}
    >
      <AskForm />
    </V2AppShell>
  );
}
