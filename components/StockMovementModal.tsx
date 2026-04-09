"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Minus, Plus, X } from "lucide-react";
import type { InventoryItem } from "../lib/inventoryTypes";
import type { StockProject } from "../lib/stockTypes";
import { toastError } from "../lib/toast";

type StockMovementModalProps = {
  open: boolean;
  mode: "add" | "remove";
  item: InventoryItem | null;
  projects: StockProject[];
  defaultUserName?: string | null;
  onClose: () => void;
  onSubmit: (payload: {
    changeAmount: number;
    projectId: string | null;
    reason: string | null;
    userName: string;
  }) => Promise<void> | void;
};

export default function StockMovementModal(props: StockMovementModalProps) {
  const { open, item, mode, projects, defaultUserName, onClose, onSubmit } = props;
  const [quantity, setQuantity] = useState("");
  const [projectId, setProjectId] = useState("__none__");
  const [reason, setReason] = useState("");
  const [userName, setUserName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuantity("");
    setProjectId("__none__");
    setReason("");
    setUserName(defaultUserName ?? "");
  }, [defaultUserName, open, mode, item]);

  const title = mode === "add" ? "Entrée de stock" : "Sortie de stock";
  const Icon = mode === "add" ? ArrowUp : ArrowDown;
  const buttonIcon = mode === "add" ? Plus : Minus;
  const accentClass = mode === "add" ? "text-emerald-700" : "text-amber-700";
  const buttonClass =
    mode === "add"
      ? "bg-emerald-600 hover:bg-emerald-700"
      : "bg-amber-600 hover:bg-amber-700";

  const helperText = useMemo(() => {
    if (!item) return "";
    return mode === "add"
      ? `Quantité actuelle : ${item.quantity}.`
      : `Quantité actuelle : ${item.quantity}. Vous pouvez retirer jusqu'à ${item.quantity}.`;
  }, [item, mode]);

  if (!open || !item) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const absoluteAmount = Math.max(0, Math.round(Number(quantity) || 0));
    if (absoluteAmount <= 0) {
      toastError("Saisissez une quantité supérieure à 0.");
      return;
    }

    if (mode === "remove" && absoluteAmount > item.quantity) {
      toastError("Impossible de retirer plus que la quantité disponible.");
      return;
    }

    const trimmedUserName = userName.trim();
    if (!trimmedUserName) {
      toastError("Indiquez qui effectue le mouvement.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        changeAmount: mode === "add" ? absoluteAmount : -absoluteAmount,
        projectId: projectId === "__none__" ? null : projectId,
        reason: reason.trim() || null,
        userName: trimmedUserName,
      });
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
      <div className="ui-surface w-full max-w-2xl rounded-[28px] p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/50">
              Mouvement de stock
            </p>
            <h2 className="ui-heading mt-1 text-2xl font-semibold text-[var(--foreground)]">
              {title}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--foreground)]/60">{item.name}</p>
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3">
            <p className={["inline-flex items-center gap-2 text-sm font-semibold", accentClass].join(" ")}>
              <Icon className="h-4 w-4" />
              {helperText}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Combien d&apos;articles {mode === "add" ? "ajouter" : "retirer"} ?
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
                placeholder="Ex. 50"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Qui êtes-vous ?
              </label>
              <input
                value={userName}
                onChange={(event) => setUserName(event.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
                placeholder="Votre nom"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Pour quel projet ?
              </label>
              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              >
                <option value="__none__">Autre / Aucun</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Raison
              </label>
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
                placeholder={mode === "add" ? "Ex. Réassort fournisseur" : "Ex. Dotation salon, perte, don client"}
              />
            </div>
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
              className={["ui-transition inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60", buttonClass].join(" ")}
            >
              {buttonIcon === Plus ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
              {submitting ? "Enregistrement..." : mode === "add" ? "Valider l'entrée" : "Valider la sortie"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
