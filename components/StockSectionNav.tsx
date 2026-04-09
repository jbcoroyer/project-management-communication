"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, Package } from "lucide-react";

const items = [
  { href: "/stock", label: "Stock", icon: Package },
  { href: "/stock/history", label: "Historique", icon: ClipboardList },
  { href: "/stock/dashboard", label: "Dashboard", icon: BarChart3 },
];

export default function StockSectionNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2"
      aria-label="Navigation stock"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "ui-transition inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold",
              active
                ? "bg-[var(--accent)] text-[#fffdf9] shadow-sm"
                : "text-[color:var(--foreground)]/70 hover:bg-[var(--surface-soft)]",
            ].join(" ")}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
