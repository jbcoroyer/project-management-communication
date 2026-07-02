"use client";

import AppShell from "../../components/AppShell";
import AdminSettingsPanel from "../../components/settings/AdminSettingsPanel";
import { useCurrentUser } from "../../lib/useCurrentUser";

export default function SettingsPage() {
  const { user: currentUser } = useCurrentUser();

  return (
    <AppShell
      currentUserName={currentUser?.teamMemberName ?? currentUser?.displayName ?? undefined}
      currentUserEmail={currentUser?.email}
      currentUserAvatarUrl={currentUser?.avatarUrl}
      currentUserJobTitle={currentUser?.jobTitle}
    >
      <AdminSettingsPanel />
    </AppShell>
  );
}
