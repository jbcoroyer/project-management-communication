"use client";

import { useState } from "react";
import {
  getCatalogEntry,
  matchCatalogFromName,
  type SalonCatalogEntry,
} from "../../lib/salonCatalog";

type Props = {
  slug?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
};

function resolveEntry(slug?: string | null, name?: string | null): SalonCatalogEntry | undefined {
  return getCatalogEntry(slug) ?? (name ? matchCatalogFromName(name) : undefined);
}

/** Logo catalogue (SVG wordmark) ; fallback coloré si image absente. */
export default function SalonLogo({ slug, name, size = 40, className = "" }: Props) {
  const entry = resolveEntry(slug, name);
  const [broken, setBroken] = useState(false);
  const label = entry?.shortName ?? name?.replace(/\b20\d{2}\b/g, "").trim() ?? "?";
  const showImg = Boolean(entry?.logoSrc) && !broken;

  if (showImg && entry) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 ${className}`}
        style={{ width: size, height: size }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={entry.logoSrc}
          alt={entry.name}
          width={size}
          height={size}
          className="h-full w-full object-contain p-[8%]"
          onError={() => setBroken(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl bg-[var(--foreground)] text-[var(--accent-contrast)] shadow-sm ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.22) }}
      title={label}
      aria-hidden
    >
      <span className="px-1 text-center font-bold uppercase leading-tight tracking-tight">
        {label.length > 8 ? label.slice(0, 6) : label}
      </span>
    </span>
  );
}
