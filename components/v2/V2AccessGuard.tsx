"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { APP_VERSION_STORAGE_KEY, toV1Path } from "../../lib/appVersion";

export default function V2AccessGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let enabled = false;
    try {
      enabled = window.localStorage.getItem(APP_VERSION_STORAGE_KEY) === "v2";
    } catch {
      enabled = false;
    }

    if (enabled) {
      setAllowed(true);
      return;
    }

    router.replace(toV1Path(pathname));
  }, [pathname, router]);

  if (!allowed) return null;

  return <>{children}</>;
}
