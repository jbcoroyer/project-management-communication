import { Suspense } from "react";
import { notFound } from "next/navigation";
import DashboardHomePage from "../../../components/dashboard/DashboardHomePage";

const VALID_TABS = new Set(["kanban", "todo", "calendar", "analytics", "archives", "workload"]);

export default async function DashboardTabPage({
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
      <DashboardHomePage />
    </Suspense>
  );
}
