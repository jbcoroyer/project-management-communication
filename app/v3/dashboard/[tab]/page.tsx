import { Suspense } from "react";
import { notFound } from "next/navigation";
import V3DashboardHomePage from "../../../../components/v3/dashboard/V3DashboardHomePage";

/** Onglets V3 : sans triage (demandes retirées). */
const VALID_TABS = new Set([
  "inbox",
  "kanban",
  "list",
  "todo",
  "calendar",
  "gantt",
  "analytics",
  "archives",
  "workload",
]);

export default async function V3DashboardTabPage({
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
      <V3DashboardHomePage />
    </Suspense>
  );
}
