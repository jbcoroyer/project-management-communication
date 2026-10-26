"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import IdenaLogo from "./IdenaLogo";
import { TuesdayLogo } from "@/components/brand";
import { useIdenaMark } from "../lib/idenaMarkContext";
import { isExternalImageSrc } from "../lib/idenaMarkSrc";

export function IdenaMark({ className = "h-9 w-9" }: { className?: string }) {
  const { customSrc } = useIdenaMark();

  if (customSrc && isExternalImageSrc(customSrc)) {
    return (
      <div
        className={[
          "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--surface)] ring-1 ring-[var(--line)]",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- pictogramme personnalisé (URL externe) */}
        <img src={customSrc} alt="IDENA" className="h-full w-full object-contain object-center" />
      </div>
    );
  }

  return <IdenaLogo variant="icon" className={className} />;
}

type BrandHeadingProps = {
  size?: "sidebar" | "login";
  /** Animation d’entrée des blocs (une fois au montage). Désactiver sur les doublons (ex. drawer mobile). */
  intro?: boolean;
  children?: ReactNode;
};

export function ServiceCommunicationIdenaHeading({
  size = "sidebar",
  intro = true,
  children,
}: BrandHeadingProps) {
  const isLogin = size === "login";
  if (isLogin) {
    return (
      <div className="mb-10 text-center">
        <div className="mb-5 flex justify-center">
          <TuesdayLogo size={56} intro={intro} />
        </div>
        <p className="ui-kicker mt-3">Service Communication · IDENA</p>
        {children}
      </div>
    );
  }
  return (
    <div>
      <Link href="/v3/dashboard/kanban" aria-label="Tuesday — accueil" className="inline-flex">
        <TuesdayLogo size={36} intro={intro} />
      </Link>
      <p className="mt-1.5 text-[10px] font-medium tracking-[0.04em] text-[color:var(--foreground)]/45">
        Service Communication · IDENA
      </p>
      {children}
    </div>
  );
}
