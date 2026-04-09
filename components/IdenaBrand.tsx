"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { useIdenaMark } from "../lib/idenaMarkContext";
import { isExternalImageSrc } from "../lib/idenaMarkSrc";

/** Pictogramme IDENA : paramètres (Supabase) puis `.env` puis `public/idena-picto.png`. */
export function IdenaMark({ className = "h-9 w-9" }: { className?: string }) {
  const { src } = useIdenaMark();
  const external = isExternalImageSrc(src);

  return (
    <div
      className={[
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white",
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
  /** Contenu optionnel sous le titre (ex. sous-titre login) */
  children?: ReactNode;
};

export function ServiceCommunicationIdenaHeading({ size = "sidebar", children }: BrandHeadingProps) {
  const isLogin = size === "login";
  if (isLogin) {
    return (
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <IdenaMark className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]" />
        </div>
        <h1 className="ui-heading text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
          Service Communication{" "}
          <span className="font-bold text-[color:var(--foreground)]/70">IDENA</span>
        </h1>
        {children}
      </div>
    );
  }
  return (
    <div className="mb-6">
      <div className="flex items-start gap-3">
        <IdenaMark className="h-10 w-10" />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/70">
            Service Communication
          </p>
          <h1 className="mt-0.5 text-lg font-semibold leading-snug tracking-tight">
            <span className="font-bold text-[color:var(--foreground)]/70">IDENA</span>
          </h1>
        </div>
      </div>
      {children}
    </div>
  );
}
