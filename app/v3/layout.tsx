import type { ReactNode } from "react";
import V3AppLayout from "../../components/v3/V3AppLayout";

export default function V3Layout({ children }: { children: ReactNode }) {
  return <V3AppLayout>{children}</V3AppLayout>;
}
