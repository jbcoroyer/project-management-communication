import { Suspense } from "react";
import RdGatesPage from "../../../../components/v3/rd/RdGatesPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RdGatesPage />
    </Suspense>
  );
}
