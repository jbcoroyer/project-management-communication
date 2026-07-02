"use client";

import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, Package } from "lucide-react";
import SectionNav from "./ui/SectionNav";

const defaultItems = [
  { href: "/stock", label: "Stock", icon: Package },
  { href: "/stock/history", label: "Historique", icon: ClipboardList },
  { href: "/stock/dashboard", label: "Dashboard", icon: BarChart3 },
];

export default function StockSectionNav({ basePath = "/stock" }: { basePath?: string }) {
  const pathname = usePathname();
  const items =
    basePath === "/stock"
      ? defaultItems
      : [
          { href: basePath, label: "Stock", icon: Package },
          { href: `${basePath}/history`, label: "Historique", icon: ClipboardList },
          { href: `${basePath}/dashboard`, label: "Dashboard", icon: BarChart3 },
        ];
  return <SectionNav items={items} activeHref={pathname} ariaLabel="Navigation stock" />;
}
