"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, FileText, X } from "lucide-react";
import { isLowStock, type InventoryItem } from "../lib/inventoryTypes";
import { toastError } from "../lib/toast";

type InventoryReorderModalProps = {
  open: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onSubmit: (value: string) => Promise<void> | void;
};

export default function InventoryReorderModal(props: InventoryReorderModalProps) {
  const { open, item, onClose, onSubmit } = props;
  const [quoteInfo, setQuoteInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuoteInfo(item?.lastQuoteInfo ?? "");
  }, [open, item]);

  if (!open || !item) return null;

  const lowStock = isLowStock(item);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!quoteInfo.trim()) {
      toastError("Ajoutez les informations du devis ou de la re-commande.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(quoteInfo);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="ui-surface max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/50">
              Infos
            </p>
            <h2 className="ui-heading mt-1 text-2xl font-semibold text-[var(--foreground)]">
              {item.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-transition rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2 text-[color:var(--foreground)]/60 hover:bg-[var(--surface-soft)]"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/45">
              Quantité actuelle
            </p>
            <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{item.quantity}</p>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/45">
              Seuil d&apos;alerte
            </p>
            <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">{item.alertThreshold}</p>
          </div>
          <div
            className={[
              "rounded-2xl border px-4 py-3",
              lowStock ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50",
            ].join(" ")}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/45">
              Statut
            </p>
            <p
              className={[
                "mt-1 inline-flex items-center gap-1.5 text-sm font-semibold",
                lowStock ? "text-rose-700" : "text-emerald-700",
              ].join(" ")}
            >
              <AlertTriangle className="h-4 w-4" />
              {lowStock ? "À recommander" : "Stock OK"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-4">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--foreground)]/70">
              <FileText className="h-3.5 w-3.5" />
              Dernier devis / infos de re-commande
            </div>
            <textarea
              value={quoteInfo}
              onChange={(event) => setQuoteInfo(event.target.value)}
              className="ui-focus-ring min-h-[220px] w-full rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm"
              placeholder="Référence du devis, prix précédent, quantités minimales, nom de l'imprimeur, contact, délais..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--line)] pt-4">
            <button
              type="button"
              onClick={onClose}
              className="ui-transition rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="ui-transition rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#fffdf9] shadow-sm hover:bg-[var(--accent-strong)] disabled:opacity-60"
            >
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
