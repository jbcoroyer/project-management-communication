"use client";

import Image from "next/image";
import { UserCircle2 } from "lucide-react";
import type { PresenceMember } from "../../lib/v2/usePresence";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function PresenceBar({ members }: { members: PresenceMember[] }) {
  if (members.length === 0) return null;

  const shown = members.slice(0, 4);
  const extra = members.length - shown.length;

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-1 shadow-[var(--shadow-1)]"
      title={`En ligne : ${members.map((m) => m.name).join(", ")}`}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success)] opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--success)]" />
      </span>
      <div className="flex -space-x-2">
        {shown.map((member) => (
          <span
            key={member.key}
            className="relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-[var(--surface)] bg-[var(--surface-soft)] text-[9px] font-bold text-[color:var(--foreground)]/70 ring-1 ring-[var(--line)]"
            title={member.name}
          >
            {member.avatarUrl ? (
              <Image src={member.avatarUrl} alt={member.name} fill sizes="24px" className="object-cover" />
            ) : initials(member.name) ? (
              initials(member.name)
            ) : (
              <UserCircle2 className="h-4 w-4" />
            )}
          </span>
        ))}
      </div>
      {extra > 0 ? (
        <span className="text-[11px] font-semibold text-[color:var(--foreground)]/55">+{extra}</span>
      ) : null}
    </div>
  );
}
