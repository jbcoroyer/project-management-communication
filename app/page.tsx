"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import PublicProductDemo from "../components/PublicProductDemo";
import { useCurrentUser } from "../lib/useCurrentUser";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard/kanban");
    }
  }, [loading, user, router]);

  if (loading || user) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 lg:px-8">
          <div className="ui-surface h-20 animate-pulse rounded-2xl" />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="ui-surface h-64 animate-pulse rounded-2xl" />
            <div className="ui-surface h-64 animate-pulse rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return <PublicProductDemo />;
}
