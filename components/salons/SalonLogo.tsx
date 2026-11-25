"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, RotateCcw } from "lucide-react";
import {
  getCatalogEntry,
  matchCatalogFromName,
  type SalonCatalogEntry,
} from "../../lib/salonCatalog";
import { SALON_LOGO_ACCEPT } from "../../lib/salonLogoUpload";

type Props = {
  slug?: string | null;
  name?: string | null;
  /** URL custom (upload) — prioritaire sur le catalogue. */
  logoUrl?: string | null;
  size?: number;
  className?: string;
  /** Clic droit → menu « Changer le logo… ». */
  editable?: boolean;
  onChangeLogo?: (file: File) => void | Promise<void>;
  onResetLogo?: () => void | Promise<void>;
  uploading?: boolean;
};

function resolveEntry(slug?: string | null, name?: string | null): SalonCatalogEntry | undefined {
  return getCatalogEntry(slug) ?? (name ? matchCatalogFromName(name) : undefined);
}

/** Logo catalogue (SVG wordmark) ou custom ; fallback coloré si image absente. */
export default function SalonLogo({
  slug,
  name,
  logoUrl,
  size = 40,
  className = "",
  editable = false,
  onChangeLogo,
  onResetLogo,
  uploading = false,
}: Props) {
  const entry = resolveEntry(slug, name);
  const [broken, setBroken] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const label = entry?.shortName ?? name?.replace(/\b20\d{2}\b/g, "").trim() ?? "?";
  const customSrc = logoUrl?.trim() || null;
  const catalogSrc = entry?.logoSrc ?? null;
  const src = customSrc || catalogSrc;
  const showImg = Boolean(src) && !broken;
  const alt = entry?.name ?? name ?? "Logo salon";
  const canReset = Boolean(customSrc && onResetLogo);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    const onPointer = (e: MouseEvent | PointerEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setMenu(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer, true);
    };
  }, [menu]);

  const openPicker = () => {
    setMenu(null);
    fileRef.current?.click();
  };

  const shell = (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 ${
        editable ? "cursor-context-menu" : ""
      } ${uploading ? "opacity-60" : ""} ${className}`}
      style={{ width: size, height: size }}
      title={editable ? "Clic droit pour changer le logo" : undefined}
      onContextMenu={
        editable
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenu({ x: e.clientX, y: e.clientY });
            }
          : undefined
      }
      onClick={
        editable
          ? (e) => {
              // Empêche le Link parent si on clique pendant upload / menu
              if (menu || uploading) {
                e.preventDefault();
                e.stopPropagation();
              }
            }
          : undefined
      }
      aria-busy={uploading || undefined}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={alt}
          width={size}
          height={size}
          className="h-full w-full object-contain p-[8%]"
          draggable={false}
          onError={() => setBroken(true)}
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-2xl bg-[var(--foreground)] text-[var(--accent-contrast)]"
          style={{ fontSize: Math.max(9, size * 0.22) }}
          title={label}
          aria-hidden
        >
          <span className="px-1 text-center font-bold uppercase leading-tight tracking-tight">
            {label.length > 8 ? label.slice(0, 6) : label}
          </span>
        </span>
      )}
    </span>
  );

  if (!editable) return shell;

  const menuNode =
    menu && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="Logo du salon"
            className="fixed z-[80] min-w-[11.5rem] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] py-1 shadow-[0_12px_40px_rgba(20,17,13,0.14)]"
            style={{
              left: Math.min(menu.x, window.innerWidth - 200),
              top: Math.min(menu.y, window.innerHeight - 120),
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-soft)] disabled:opacity-50"
              disabled={uploading || !onChangeLogo}
              onClick={openPicker}
            >
              <ImagePlus className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
              Changer le logo…
            </button>
            {canReset ? (
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-[color:var(--foreground)]/70 hover:bg-[var(--surface-soft)] disabled:opacity-50"
                disabled={uploading}
                onClick={() => {
                  setMenu(null);
                  void onResetLogo?.();
                }}
              >
                <RotateCcw className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                Logo catalogue
              </button>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <span className="relative inline-flex shrink-0">
      {shell}
      <input
        ref={fileRef}
        type="file"
        accept={SALON_LOGO_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file && onChangeLogo) void onChangeLogo(file);
        }}
      />
      {menuNode}
    </span>
  );
}
