"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { clampMenuPosition } from "../../lib/contextMenuHelpers";

export type ContextMenuPosition = { x: number; y: number };

export type ContextMenuItem =
  | { id: string; type: "separator" }
  | { id: string; type: "label"; label: string }
  | {
      id: string;
      type?: "item";
      label: string;
      icon?: ReactNode;
      disabled?: boolean;
      danger?: boolean;
      onSelect: () => void;
    };

const LONG_PRESS_MS = 480;
const MENU_MIN_WIDTH = 184;
const MENU_EST_HEIGHT = 220;

export function useContextMenu() {
  const [position, setPosition] = useState<ContextMenuPosition | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const longPressOrigin = useRef<ContextMenuPosition | null>(null);
  const suppressClickRef = useRef(false);

  const close = useCallback(() => setPosition(null), []);

  const openAt = useCallback((x: number, y: number) => {
    setPosition({ x, y });
  }, []);

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressOrigin.current = null;
  }, []);

  const onContextMenu = useCallback(
    (e: ReactMouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      openAt(e.clientX, e.clientY);
    },
    [openAt],
  );

  const onTouchStart = useCallback(
    (e: ReactTouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      longPressOrigin.current = { x: t.clientX, y: t.clientY };
      longPressTimer.current = window.setTimeout(() => {
        const origin = longPressOrigin.current;
        if (origin) {
          suppressClickRef.current = true;
          openAt(origin.x, origin.y);
        }
        longPressTimer.current = null;
      }, LONG_PRESS_MS);
    },
    [openAt],
  );

  const onTouchMove = useCallback(
    (e: ReactTouchEvent) => {
      const origin = longPressOrigin.current;
      const t = e.touches[0];
      if (!origin || !t) return;
      if (Math.hypot(t.clientX - origin.x, t.clientY - origin.y) > 12) {
        clearLongPress();
      }
    },
    [clearLongPress],
  );

  const onTouchEnd = useCallback(() => {
    clearLongPress();
  }, [clearLongPress]);

  const consumeClickSuppression = useCallback(() => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

  const triggerProps = {
    onContextMenu,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel: onTouchEnd,
  } as const;

  return {
    position,
    openAt,
    close,
    triggerProps,
    isOpen: position != null,
    consumeClickSuppression,
  };
}

export function ContextMenu(props: {
  position: ContextMenuPosition | null;
  items: ContextMenuItem[];
  onClose: () => void;
  ariaLabel?: string;
}) {
  const { position, items, onClose, ariaLabel = "Menu contextuel" } = props;
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!position) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointer = (e: MouseEvent | PointerEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer, true);
    };
  }, [position, onClose]);

  if (!position || typeof document === "undefined") return null;

  const clamped = clampMenuPosition(
    position.x,
    position.y,
    { width: window.innerWidth, height: window.innerHeight },
    { width: MENU_MIN_WIDTH, height: MENU_EST_HEIGHT },
  );

  return createPortal(
    <div
      ref={menuRef}
      id={menuId}
      role="menu"
      aria-label={ariaLabel}
      className="fixed z-[80] min-w-[11.5rem] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] py-1 shadow-[0_12px_40px_rgba(20,17,13,0.14)]"
      style={{ left: clamped.x, top: clamped.y }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {items.map((item) => {
        if (item.type === "separator") {
          return (
            <div
              key={item.id}
              role="separator"
              className="my-1 border-t border-[var(--line)]"
            />
          );
        }
        if (item.type === "label") {
          return (
            <p
              key={item.id}
              className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/45"
            >
              {item.label}
            </p>
          );
        }
        const disabled = Boolean(item.disabled);
        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={disabled}
            className={[
              "flex w-full items-center gap-2 px-3 py-2 text-left text-xs disabled:opacity-40",
              item.danger
                ? "font-semibold text-rose-700 hover:bg-rose-50"
                : "font-semibold text-[var(--foreground)] hover:bg-[var(--surface-soft)]",
            ].join(" ")}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (disabled) return;
              // onSelect avant onClose : garde le geste user pour input.click() (file picker).
              item.onSelect();
              onClose();
            }}
          >
            {item.icon ? (
              <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center opacity-70" aria-hidden>
                {item.icon}
              </span>
            ) : null}
            {item.label}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}
