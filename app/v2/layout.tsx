import type { ReactNode } from "react";
import V2AccessGuard from "../../components/v2/V2AccessGuard";
import V2AppLayout from "../../components/v2/V2AppLayout";

export default function V2Layout({ children }: { children: ReactNode }) {
  return (
    <V2AccessGuard>
      <V2AppLayout>{children}</V2AppLayout>
    </V2AccessGuard>
  );
}
