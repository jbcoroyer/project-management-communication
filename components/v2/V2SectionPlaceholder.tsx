"use client";

import type { ReactNode } from "react";
import V2AppShell from "./AppShell";
import { useCurrentUser } from "../../lib/useCurrentUser";

type V2SectionPlaceholderProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export default function V2SectionPlaceholder({
  title,
  description,
  children,
}: V2SectionPlaceholderProps) {
  const { user } = useCurrentUser();

  return (
    <V2AppShell
      currentUserName={user?.teamMemberName ?? user?.displayName ?? undefined}
      currentUserEmail={user?.email}
      currentUserAvatarUrl={user?.avatarUrl}
      currentUserJobTitle={user?.jobTitle}
    >
      <div className="ui-surface mx-auto max-w-3xl border-l-4 border-l-[var(--accent)] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
          Version 2
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-[color:var(--foreground)]/65">{description}</p>
        {children}
      </div>
    </V2AppShell>
  );
}
