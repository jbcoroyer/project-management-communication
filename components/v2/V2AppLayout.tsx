"use client";

import type { ReactNode } from "react";
import V2AppShell from "./AppShell";
import { V2ShellSlotsProvider, useV2ShellSlots } from "../../lib/v2/shellSlotsContext";

function V2AppShellWithSlots({ children }: { children: ReactNode }) {
  const { toolbarRight, searchSlot } = useV2ShellSlots();
  return (
    <V2AppShell toolbarRight={toolbarRight ?? undefined} searchSlot={searchSlot ?? undefined}>
      {children}
    </V2AppShell>
  );
}

export default function V2AppLayout({ children }: { children: ReactNode }) {
  return (
    <V2ShellSlotsProvider>
      <V2AppShellWithSlots>{children}</V2AppShellWithSlots>
    </V2ShellSlotsProvider>
  );
}
