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
        <p className="ui-kicker mb-2">Service Communication</p>
        <h1 className="ui-display text-3xl text-[var(--foreground)] sm:text-4xl">IDENA</h1>
        {children}
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center gap-3">
        <IdenaMark className="h-10 w-10" />
        <div className="min-w-0">
          <p className="ui-kicker">Service Communication</p>
          <h1 className="ui-display text-xl leading-tight text-[var(--foreground)]">IDENA</h1>
        </div>
      </div>
      {children}
    </div>
  );
}
