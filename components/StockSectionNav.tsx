"use client";

import { usePathname } from "next/navigation";
import { BarChart3, ClipboardList, Package } from "lucide-react";
import SectionNav from "./ui/SectionNav";

const items = [
  { href: "/stock", label: "Stock", icon: Package },
  { href: "/stock/history", label: "Historique", icon: ClipboardList },
  { href: "/stock/dashboard", label: "Dashboard", icon: BarChart3 },
];

export default function StockSectionNav() {
  const pathname = usePathname();
  return <SectionNav items={items} activeHref={pathname} ariaLabel="Navigation stock" />;
}
