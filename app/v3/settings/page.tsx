import { Suspense } from "react";
import V2SettingsPage from "../../../components/v2/settings/V2SettingsPage";

export default function V3SettingsRoute() {
  return (
    <Suspense fallback={null}>
      <V2SettingsPage />
    </Suspense>
  );
}
