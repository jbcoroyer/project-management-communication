"use client";

import V2AppShell from "../AppShell";
import { useCurrentUser } from "../../../lib/useCurrentUser";
import StockInventoryWorkspace from "../../stock/StockInventoryWorkspace";

export default function V2StockPage() {
  const { user } = useCurrentUser();

  return (
    <V2AppShell
      currentUserName={user?.teamMemberName ?? user?.displayName ?? undefined}
      currentUserEmail={user?.email}
      currentUserAvatarUrl={user?.avatarUrl}
      currentUserJobTitle={user?.jobTitle}
    >
      <StockInventoryWorkspace basePath="/v2/stock" />
    </V2AppShell>
  );
}
