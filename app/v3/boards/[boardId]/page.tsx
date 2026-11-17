import { Suspense } from "react";
import V3DashboardHomePage from "../../../../components/v3/dashboard/V3DashboardHomePage";

export default function V3BoardPage() {
  return (
    <Suspense fallback={null}>
      <V3DashboardHomePage />
    </Suspense>
  );
}
