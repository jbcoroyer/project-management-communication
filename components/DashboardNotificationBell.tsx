"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useInAppNotifications } from "../lib/inAppNotificationsContext";

function formatNotifTime(at: number): string {
  try {
    return new Date(at).toLocaleString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

type PanelPos = { top: number; right: number; width: number; maxHeight: number };

export default function DashboardNotificationBell() {
  const { history, markHistoryRead, clearHistory, unreadCount } = useInAppNotifications();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelPos, setPanelPos] = useState<PanelPos>({ top: 0, right: 16, width: 380, maxHeight: 420 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const updatePanelPosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(380, Math.max(280, window.innerWidth - 2 * margin));
    const top = r.bottom + margin;
    const maxHeight = Math.min(420, Math.max(200, window.innerHeight - top - margin));
    setPanelPos({
      top,
      right: Math.max(margin, window.innerWidth - r.right),
      width,
      maxHeight,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updatePanelPosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const panel = open ? (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Centre de notifications"
      className="ui-surface flex flex-col overflow-hidden rounded-2xl border border-[var(--line-strong)] shadow-[0_24px_80px_rgba(20,17,13,0.22)]"
      style={{
        position: "fixed",
        zIndex: 250,
        top: panelPos.top,
        right: panelPos.right,
        width: panelPos.width,
        maxHeight: panelPos.maxHeight,
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">Notifications</p>
        {history.length > 0 ? (
          <button
            type="button"
            onClick={() => clearHistory()}
            className="ui-transition text-[11px] font-semibold text-[color:var(--foreground)]/55 hover:text-[var(--accent)]"
          >
            Tout effacer
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-6 text-center">
            <p className="text-sm font-medium text-[color:var(--foreground)]/75">Aucune notification pour l’instant</p>
            <p className="mt-2 text-xs leading-relaxed text-[color:var(--foreground)]/55">
              Vous verrez ici les nouvelles tâches qui vous concernent, les changements d’échéance ou de colonne
              (temps réel), ainsi que les rappels de dates limites. Si un autre collaborateur modifie le Kanban, une
              alerte apparaît aussi en haut à droite de l’écran.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {history.map((item) => (
              <li
                key={item.id}
                className={[
                  "rounded-xl border px-3 py-2.5",
                  item.read
                    ? "border-[var(--line)] bg-[var(--surface)]"
                    : "border-[var(--line-strong)] bg-[var(--surface-soft)]",
                ].join(" ")}
              >
                <p className="text-xs font-semibold text-[var(--foreground)]">{item.title}</p>
                {item.body ? (
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[color:var(--foreground)]/60">{item.body}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] text-[color:var(--foreground)]/45">{formatNotifTime(item.at)}</span>
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="text-[11px] font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]"
                    >
                      Ouvrir
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="shrink-0">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => {
            setOpen((was) => {
              const next = !was;
              if (next) markHistoryRead();
              return next;
            });
          }}
          title="Notifications"
          aria-expanded={open}
          aria-haspopup="dialog"
          className="ui-transition relative flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] text-[color:var(--foreground)]/75 shadow-[0_8px_22px_rgba(20,17,13,0.08)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
        >
          <Bell className="h-5 w-5" strokeWidth={2} aria-hidden />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold text-[#fffdf9]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
          <span className="sr-only">Notifications</span>
        </button>
      </div>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </>
  );
}
