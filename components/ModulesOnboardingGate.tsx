"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useWorkspaceOptional } from "../lib/useWorkspace";

/**
 * Redirige les owners/admins d’un nouvel espace vers /onboarding
 * tant que les modules n’ont pas été choisis.
 * Ne concerne jamais le Service Communication.
 */
export default function ModulesOnboardingGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const workspace = useWorkspaceOptional();

  useEffect(() => {
    if (!workspace || workspace.loading) return;
    if (!workspace.needsModulesOnboarding) return;
    if (pathname.startsWith("/onboarding")) return;
    if (pathname.startsWith("/login") || pathname.startsWith("/invite")) return;
    router.replace("/onboarding");
  }, [pathname, router, workspace]);

  return <>{children}</>;
}
