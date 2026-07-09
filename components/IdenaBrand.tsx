"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { useIdenaMark } from "../lib/idenaMarkContext";
import { isExternalImageSrc } from "../lib/idenaMarkSrc";

export function IdenaMark({ className = "h-9 w-9" }: { className?: string }) {
  const { src } = useIdenaMark();
  const external = isExternalImageSrc(src);

  return (
    <div
      className={[
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--surface)] ring-1 ring-[var(--line)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="relative h-full w-full min-h-[18px] min-w-[18px]">
        {external ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL externe sans config domains
          <img src={src} alt="IDENA" className="h-full w-full object-contain object-center" />
        ) : (
          <Image
            src={src}
            alt="IDENA"
            fill
            className="object-contain object-center"
            sizes="96px"
          />
        )}
      </div>
    </div>
  );
}

type WordmarkSize = "sidebar" | "login" | "compact";

export function TuesdayWordmark({ size = "sidebar" }: { size?: WordmarkSize }) {
  const sizeClass =
    size === "login"
      ? "text-[2.75rem] sm:text-[3.25rem]"
      : size === "compact"
        ? "text-xl"
        : "text-[1.75rem] sm:text-[1.9rem]";

  return (
    <span
      className={["tuesday-wordmark ui-display text-[var(--foreground)]", sizeClass].join(" ")}
      aria-label="Tuesday"
    >
      Tues
      <span className="text-[var(--accent)]">day</span>
    </span>
  );
}

type BrandHeadingProps = {
  size?: "sidebar" | "login";
  children?: ReactNode;
};

export function ServiceCommunicationIdenaHeading({ size = "sidebar", children }: BrandHeadingProps) {
  const isLogin = size === "login";
  if (isLogin) {
    return (
      <div className="mb-10 text-center">
        <div className="mb-5 flex justify-center">
          <IdenaMark className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]" />
        </div>
        <TuesdayWordmark size="login" />
        <p className="ui-kicker mt-3">Service Communication · IDENA</p>
        {children}
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-start gap-3">
        <IdenaMark className="mt-0.5 h-10 w-10" />
        <div className="min-w-0">
          <TuesdayWordmark size="sidebar" />
          <p className="mt-1 text-[11px] font-medium tracking-[0.08em] text-[color:var(--foreground)]/50">
            Service Communication · IDENA
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}
