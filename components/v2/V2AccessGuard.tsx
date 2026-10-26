import type { ReactNode } from "react";

/** Plus de garde d'accès expérimental — V3 est l'interface par défaut. */
export default function V2AccessGuard({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
