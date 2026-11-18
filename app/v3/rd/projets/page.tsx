import { Suspense } from "react";
import RdProjectsPage from "../../../../components/v3/rd/RdProjectsPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RdProjectsPage />
    </Suspense>
  );
}
