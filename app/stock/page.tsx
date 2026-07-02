"use client";

import AppShell from "../../components/AppShell";
import StockInventoryWorkspace from "../../components/stock/StockInventoryWorkspace";
import { useCurrentUser } from "../../lib/useCurrentUser";

export default function StockPage() {
  const { user: currentUser } = useCurrentUser();

  return (
    <AppShell
      currentUserName={currentUser?.displayName ?? currentUser?.teamMemberName ?? currentUser?.email}
      currentUserEmail={currentUser?.email}
      currentUserAvatarUrl={currentUser?.avatarUrl}
      currentUserJobTitle={currentUser?.jobTitle}
    >
      <StockInventoryWorkspace basePath="/stock" />
    </AppShell>
  );
}
