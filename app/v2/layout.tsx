import type { ReactNode } from "react";
import { redirect } from "next/navigation";

/** V3 est l'unique interface — les routes /v2 basculent vers V3. */
export default function V2Layout({ children: _children }: { children: ReactNode }) {
  redirect("/v3/dashboard/kanban");
}
