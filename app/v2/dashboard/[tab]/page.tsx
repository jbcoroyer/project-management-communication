import { Suspense } from "react";
import { notFound } from "next/navigation";
import V2DashboardHomePage from "../../../../components/v2/dashboard/V2DashboardHomePage";

const VALID_TABS = new Set([
  "inbox",
  "kanban",
  "list",
  "todo",
  "calendar",
  "analytics",
  "archives",
  "workload",
  "triage",
]);

export default async function V2DashboardTabPage({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = await params;
  if (!VALID_TABS.has(tab)) {
    notFound();
  }

  return (
    <Suspense fallback={null}>
      <V2DashboardHomePage />
    </Suspense>
  );
}
