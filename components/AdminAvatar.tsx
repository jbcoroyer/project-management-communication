"use client";

import Image from "next/image";
import type { AdminId } from "../lib/types";
import { adminAvatarMetaFor } from "../lib/kanbanStyles";
import { useAdminAvatarMap } from "../lib/adminAvatarContext";

export default function AdminAvatar(props: {
  admin: AdminId;
  size?: "sm" | "md";
  /** URL forcée (override le contexte). Utile dans settings. */
  avatarUrl?: string | null;
}) {
  const { admin, size = "sm", avatarUrl: urlProp } = props;
  const avatarMap = useAdminAvatarMap();
  const avatarUrl = urlProp !== undefined ? urlProp : (avatarMap[admin] ?? null);

  const meta = adminAvatarMetaFor(admin);
  const dim = size === "md" ? 32 : 20;
  const cls = [
    "inline-flex items-center justify-center rounded-full overflow-hidden shrink-0",
    size === "md" ? "h-8 w-8" : "h-5 w-5",
    !avatarUrl ? [meta.avatarBg, meta.avatarText].join(" ") : "",
  ].join(" ");

  if (avatarUrl) {
    return (
      <span className={cls} aria-hidden="true" title={admin}>
        <Image
          src={avatarUrl}
          alt={admin}
          width={dim}
          height={dim}
          className="h-full w-full object-cover"
          unoptimized
        />
      </span>
    );
  }

  return (
    <span className={cls} aria-hidden="true" title={admin}>
      {meta.gender === "female" ? (
        <svg viewBox="0 0 24 24" className="h-[70%] w-[70%]" fill="currentColor">
          <circle cx="12" cy="7.5" r="3.2" />
          <path d="M7.2 20c.4-3.9 2.6-6 4.8-6s4.4 2.1 4.8 6H7.2Z" />
          <path d="M6.8 8.3c0-3 2.3-5 5.2-5s5.2 2 5.2 5c0 1.1-.3 2-.8 2.8-.4-.9-1.3-1.6-2.6-1.8-.5 1.3-1.7 2.1-3.2 2.1-1.2 0-2.3-.6-2.9-1.6-.6.5-.9 1.1-1 1.9-.6-.8-.9-1.7-.9-2.4Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-[70%] w-[70%]" fill="currentColor">
          <circle cx="12" cy="7.2" r="3.2" />
          <path d="M7.4 20c.4-3.5 2.4-5.5 4.6-5.5s4.2 2 4.6 5.5H7.4Z" />
          <path d="M8 10.4h8v1.4H8z" />
        </svg>
      )}
    </span>
  );
}
