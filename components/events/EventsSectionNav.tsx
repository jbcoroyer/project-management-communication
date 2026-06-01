"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import SectionNav from "../ui/SectionNav";

export default function EventsSectionNav() {
  const pathname = usePathname();
  const activeHref =
    pathname === "/events/dashboard" || pathname === "/events" ? "/events/dashboard" : "";

  return (
    <SectionNav
      items={[{ href: "/events/dashboard", label: "Hub événementiel", icon: LayoutDashboard }]}
      activeHref={activeHref}
      ariaLabel="Navigation événements"
    />
  );
}
