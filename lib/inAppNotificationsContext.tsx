"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import TaskRealtimeNotifications from "../components/TaskRealtimeNotifications";
import type { InAppNotificationHistoryEntry, InAppNotificationInput } from "./inAppNotificationTypes";

export type { InAppNotificationInput, InAppNotificationHistoryEntry } from "./inAppNotificationTypes";

type ToastItem = InAppNotificationInput & { id: string };

type InAppNotificationsContextValue = {
  pushNotification: (input: InAppNotificationInput) => void;
  dismissToast: (id: string) => void;
  history: InAppNotificationHistoryEntry[];
  markHistoryRead: () => void;
  clearHistory: () => void;
  unreadCount: number;
};

const InAppNotificationsContext = createContext<InAppNotificationsContextValue | null>(null);

export function useOptionalInAppNotifications() {
  return useContext(InAppNotificationsContext);
}

export function useInAppNotifications(): InAppNotificationsContextValue {
  const ctx = useContext(InAppNotificationsContext);
  if (!ctx) {
    throw new Error("useInAppNotifications doit être utilisé sous InAppNotificationProvider.");
  }
  return ctx;
}

const AUTO_DISMISS_MS = 12_000;
const MAX_TOASTS = 6;
const MAX_HISTORY = 40;

function NotificationStack(props: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  const { items, onDismiss } = props;
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || items.length === 0) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed z-[200] flex flex-col gap-3 p-0"
      style={{
        top: "max(5.25rem, env(safe-area-inset-top, 0px))",
        right: "max(1rem, env(safe-area-inset-right, 0px))",
        width: "min(calc(100vw - 2rem), 400px)",
      }}
      aria-live="polite"
      aria-relevant="additions"
    >
      {items.map((item) => (
        <div
          key={item.id}
          className="pointer-events-auto ui-surface flex flex-col overflow-hidden rounded-2xl border border-[var(--line-strong)] shadow-[0_24px_80px_rgba(20,17,13,0.22)]"
        >
          <div className="flex items-start gap-3 border-b border-[var(--line)] px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
              <Bell className="h-4 w-4" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug text-[var(--foreground)]">{item.title}</p>
              {item.body ? (
                <p className="mt-1 text-xs leading-relaxed text-[color:var(--foreground)]/60">{item.body}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              className="ui-transition shrink-0 rounded-lg border border-transparent p-1.5 text-[color:var(--foreground)]/55 hover:border-[var(--line)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
              aria-label="Fermer la notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {item.href ? (
            <div className="px-4 py-2.5">
              <Link
                href={item.href}
                onClick={() => onDismiss(item.id)}
                className="ui-transition inline-flex text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]"
              >
                Ouvrir
              </Link>
            </div>
          ) : null}
        </div>
      ))}
    </div>,
    document.body,
  );
}

export function InAppNotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [history, setHistory] = useState<InAppNotificationHistoryEntry[]>([]);
  const timers = useMemo(() => new Map<string, ReturnType<typeof setTimeout>>(), []);

  const unreadCount = useMemo(() => history.filter((h) => !h.read).length, [history]);

  const clearTimer = useCallback(
    (id: string) => {
      const t = timers.get(id);
      if (t) {
        clearTimeout(t);
        timers.delete(id);
      }
    },
    [timers],
  );

  const dismissToast = useCallback(
    (id: string) => {
      clearTimer(id);
      setToasts((prev) => prev.filter((x) => x.id !== id));
    },
    [clearTimer],
  );

  const markHistoryRead = useCallback(() => {
    setHistory((prev) => prev.map((h) => ({ ...h, read: true })));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const pushNotification = useCallback(
    (input: InAppNotificationInput) => {
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `n-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const toast: ToastItem = { ...input, id };
      const entry: InAppNotificationHistoryEntry = {
        ...input,
        id,
        at: Date.now(),
        read: false,
      };

      setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
      setToasts((prev) => [toast, ...prev].slice(0, MAX_TOASTS));

      const t = setTimeout(() => {
        timers.delete(id);
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, AUTO_DISMISS_MS);
      timers.set(id, t);
    },
    [timers],
  );

  useEffect(() => {
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, [timers]);

  const value = useMemo(
    () => ({
      pushNotification,
      dismissToast,
      history,
      markHistoryRead,
      clearHistory,
      unreadCount,
    }),
    [pushNotification, dismissToast, history, markHistoryRead, clearHistory, unreadCount],
  );

  return (
    <InAppNotificationsContext.Provider value={value}>
      {children}
      <TaskRealtimeNotifications pushNotification={pushNotification} />
      <NotificationStack items={toasts} onDismiss={dismissToast} />
    </InAppNotificationsContext.Provider>
  );
}
