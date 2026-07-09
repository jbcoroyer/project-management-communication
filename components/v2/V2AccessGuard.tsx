import type { ReactNode } from "react";

/** V2 est l'interface par défaut ; plus de garde d'accès expérimental. */
export default function V2AccessGuard({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
