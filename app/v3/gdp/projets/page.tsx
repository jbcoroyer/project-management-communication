import { Suspense } from "react";
import GdpProjectsPage from "../../../../components/v3/gdp/GdpProjectsPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <GdpProjectsPage />
    </Suspense>
  );
}
