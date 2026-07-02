import type { ReactNode } from "react";
import V2AccessGuard from "../../components/v2/V2AccessGuard";
import V2Assistant from "../../components/v2/assistant/V2Assistant";

export default function V2Layout({ children }: { children: ReactNode }) {
  return (
    <V2AccessGuard>
      <div className="v2-theme">
        {children}
        <V2Assistant />
      </div>
    </V2AccessGuard>
  );
}
