"use client";

import type { ReactNode } from "react";
import V3AppShell from "./AppShell";
import { V2ShellSlotsProvider, useV2ShellSlots } from "../../lib/v2/shellSlotsContext";

function V3AppShellWithSlots({ children }: { children: ReactNode }) {
  const { toolbarRight, searchSlot } = useV2ShellSlots();
  return (
    <V3AppShell toolbarRight={toolbarRight ?? undefined} searchSlot={searchSlot ?? undefined}>
      {children}
    </V3AppShell>
  );
}

export default function V3AppLayout({ children }: { children: ReactNode }) {
  return (
    <V2ShellSlotsProvider>
      <V3AppShellWithSlots>{children}</V3AppShellWithSlots>
    </V2ShellSlotsProvider>
  );
}
