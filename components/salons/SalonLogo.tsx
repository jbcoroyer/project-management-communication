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

/** Logo catalogue ; fallback monogramme si image absente. */
export default function SalonLogo({ slug, name, size = 40, className = "" }: Props) {
  const entry = resolveEntry(slug, name);
  const [broken, setBroken] = useState(false);
  const label = entry?.shortName ?? name?.replace(/\b20\d{2}\b/, "").trim() ?? "?";
  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (entry && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={entry.logoSrc}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-xl object-contain bg-[var(--surface-soft)] ${className}`}
        style={{ width: size, height: size }}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-[color:var(--foreground)]/[0.08] text-[color:var(--foreground)]/70 ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.28) }}
      aria-hidden
    >
      <span className="font-semibold tracking-tight">{initials || "·"}</span>
    </span>
  );
}
