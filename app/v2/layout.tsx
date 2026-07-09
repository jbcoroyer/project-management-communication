import type { ReactNode } from "react";
import V2AccessGuard from "../../components/v2/V2AccessGuard";

export default function V2Layout({ children }: { children: ReactNode }) {
  return (
    <V2AccessGuard>
      <div className="v2-theme">{children}</div>
    </V2AccessGuard>
  );
}
