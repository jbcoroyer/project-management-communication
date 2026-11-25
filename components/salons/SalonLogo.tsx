"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, RotateCcw } from "lucide-react";
import {
  getCatalogEntry,
  matchCatalogFromName,
  type SalonCatalogEntry,
} from "../../lib/salonCatalog";
import { isolateFromParentNav } from "../../lib/isolateFromParentNav";
import { SALON_LOGO_ACCEPT } from "../../lib/salonLogoUpload";
import { ContextMenu, useContextMenu, type ContextMenuItem } from "../ui/ContextMenu";

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
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { position, close, triggerProps } = useContextMenu();
  const label = entry?.shortName ?? name?.replace(/\b20\d{2}\b/g, "").trim() ?? "?";
  const customSrc = logoUrl?.trim() || null;
  const catalogSrc = entry?.logoSrc ?? null;
  const src = customSrc || catalogSrc;
  const showImg = Boolean(src) && brokenSrc !== src;
  const alt = entry?.name ?? name ?? "Logo salon";
  const canReset = Boolean(customSrc && onResetLogo);

  const openFilePicker = useCallback(() => {
    // Hors du Link parent (portail) : évite la navigation Next au clic programmatique.
    inputRef.current?.click();
  }, []);

  const menuItems = useMemo((): ContextMenuItem[] => {
    const changeItem: ContextMenuItem = {
      id: "change",
      label: "Changer le logo…",
      icon: <ImagePlus className="h-3.5 w-3.5" />,
      disabled: uploading || !onChangeLogo,
      onSelect: openFilePicker,
    };
    if (!canReset) return [changeItem];
    return [
      changeItem,
      {
        id: "reset",
        label: "Logo catalogue",
        icon: <RotateCcw className="h-3.5 w-3.5" />,
        disabled: uploading,
        onSelect: () => {
          void onResetLogo?.();
        },
      },
    ];
  }, [canReset, onChangeLogo, onResetLogo, openFilePicker, uploading]);

  const shell = (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 ${
        editable ? "cursor-context-menu" : ""
      } ${uploading ? "opacity-60" : ""} ${className}`}
      style={{ width: size, height: size }}
      title={editable ? "Clic droit pour changer le logo" : undefined}
      {...(editable ? triggerProps : {})}
      onMouseDown={
        editable
          ? (e) => {
              isolateFromParentNav(e);
            }
          : undefined
      }
      onClick={
        editable
          ? (e) => {
              isolateFromParentNav(e);
            }
          : undefined
      }
      onPointerDown={
        editable
          ? (e) => {
              // Ne pas bloquer le long-press tactile du ContextMenu, mais couper le Link.
              e.stopPropagation();
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
          onError={() => setBrokenSrc(src)}
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

  const fileInput =
    typeof document !== "undefined"
      ? createPortal(
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={SALON_LOGO_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onClick={(e) => {
              // Sécurité si le portail n’est pas encore hors lien.
              e.stopPropagation();
            }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file && onChangeLogo) void onChangeLogo(file);
            }}
          />,
          document.body,
        )
      : null;

  return (
    <span
      className="relative inline-flex shrink-0"
      onMouseDown={isolateFromParentNav}
      onClick={isolateFromParentNav}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {shell}
      {fileInput}
      <ContextMenu
        position={position}
        items={menuItems}
        onClose={close}
        ariaLabel="Logo du salon"
      />
    </span>
  );
}
