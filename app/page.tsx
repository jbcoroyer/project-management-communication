"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_HOME_PATH } from "../lib/appVersion";
import { useCurrentUser } from "../lib/useCurrentUser";
import { TuesdayLoader } from "@/components/brand";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? DEFAULT_HOME_PATH : "/login");
  }, [loading, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <TuesdayLoader size={36} />
    </div>
  );
}
