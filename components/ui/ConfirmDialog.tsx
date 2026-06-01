"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { useIsClient } from "../../lib/useIsClient";

export type ConfirmOptions = {
  /** Titre principal de la boîte de dialogue. */
  title: string;
  /** Description / corps explicatif. Peut être un ReactNode (gras, liste, etc.). */
  description?: ReactNode;
  /** Libellé du bouton de confirmation. Défaut: "Confirmer" (rouge si destructive). */
  confirmLabel?: string;
  /** Libellé du bouton d'annulation. Défaut: "Annuler". */
  cancelLabel?: string;
  /**
   * Variante visuelle.
   * - "destructive" (par défaut) : icône poubelle, bouton rouge
   * - "warning" : icône alerte ambre, bouton ambre
   * - "default" : neutre, bouton accent
   */
  variant?: "destructive" | "warning" | "default";
};

type ConfirmContextValue = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/**
 * Hook pour ouvrir une boîte de dialogue de confirmation stylisée.
 *
 * Remplace `window.confirm()` natif par un composant uniforme et accessible.
 *
 * @example
 * const confirm = useConfirm();
 * const ok = await confirm({
 *   title: "Supprimer l'article ?",
 *   description: "Cette action est irréversible.",
 *   confirmLabel: "Supprimer",
 *   variant: "destructive",
 * });
 * if (!ok) return;
 */
export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm doit être utilisé à l'intérieur de <ConfirmDialogProvider>.");
  }
  return ctx;
}

type PendingConfirm = {
  id: number;
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
};

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const mounted = useIsClient();
  const nextIdRef = useRef(0);

  const confirm = useCallback<ConfirmContextValue>((options) => {
    return new Promise<boolean>((resolve) => {
      const id = ++nextIdRef.current;
      setPending({ id, options, resolve });
    });
  }, []);

  const close = useCallback(
    (value: boolean) => {
      setPending((current) => {
        if (current) current.resolve(value);
        return null;
      });
    },
    [],
  );

  useEffect(() => {
    if (!pending) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(false);
      } else if (event.key === "Enter") {
        event.preventDefault();
        close(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, pending]);

  const variant = pending?.options.variant ?? "destructive";
  const Icon = variant === "warning" ? AlertTriangle : variant === "default" ? AlertTriangle : Trash2;

  const iconWrapper =
    variant === "destructive"
      ? "bg-rose-50 text-rose-600"
      : variant === "warning"
        ? "bg-amber-50 text-amber-600"
        : "bg-[var(--accent-soft)] text-[var(--accent-strong)]";

  const confirmButton =
    variant === "destructive"
      ? "bg-rose-600 text-white hover:bg-rose-700"
      : variant === "warning"
        ? "bg-amber-500 text-white hover:bg-amber-600"
        : "bg-[var(--foreground)] text-[var(--accent-contrast)] hover:opacity-90";

  const overlay =
    mounted &&
    pending &&
    createPortal(
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="fixed inset-0 flex items-center justify-center bg-[var(--foreground)]/30 px-4 backdrop-blur-sm"
        style={{ zIndex: "var(--z-dialog)" }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close(false);
        }}
      >
        <div className="w-full max-w-sm rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_34px_90px_rgba(20,17,13,0.24)]">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconWrapper}`}>
              <Icon className="h-6 w-6" aria-hidden />
            </div>
            <button
              type="button"
              onClick={() => close(false)}
              className="ui-transition rounded-lg p-1.5 text-[color:var(--foreground)]/55 hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <h3
            id="confirm-dialog-title"
            className="ui-display text-lg text-[var(--foreground)]"
          >
            {pending.options.title}
          </h3>
          {pending.options.description ? (
            <p className="mt-1.5 text-sm text-[color:var(--foreground)]/65">
              {pending.options.description}
            </p>
          ) : null}
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => close(false)}
              className="ui-transition flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] py-2.5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface)]"
            >
              {pending.options.cancelLabel ?? "Annuler"}
            </button>
            <button
              type="button"
              autoFocus
              onClick={() => close(true)}
              className={`ui-transition flex-1 rounded-xl py-2.5 text-sm font-semibold shadow-sm ${confirmButton}`}
            >
              {pending.options.confirmLabel ?? (variant === "destructive" ? "Supprimer" : "Confirmer")}
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {overlay}
    </ConfirmContext.Provider>
  );
}
