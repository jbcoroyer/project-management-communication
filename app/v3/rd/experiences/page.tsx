import { Suspense } from "react";
import RdExperiencesPage from "../../../../components/v3/rd/RdExperiencesPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RdExperiencesPage />
    </Suspense>
  );
}
