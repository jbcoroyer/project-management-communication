"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";

export default function EventsSectionNav() {
  const pathname = usePathname();
  const active = pathname === "/events/dashboard" || pathname === "/events";

  return (
    <nav
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2"
      aria-label="Navigation événements"
    >
      <Link
        href="/events/dashboard"
        className={[
          "ui-transition inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold",
          active
            ? "bg-[var(--accent)] text-[#fffdf9] shadow-sm"
            : "text-[color:var(--foreground)]/70 hover:bg-[var(--surface-soft)]",
        ].join(" ")}
      >
        <LayoutDashboard className="h-4 w-4" />
        Hub événementiel
      </Link>
    </nav>
  );
}
