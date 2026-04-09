"use client";

import { useEffect, useMemo, useState } from "react";
import { Package } from "lucide-react";
import { getInventoryErrorMessage, useInventory } from "../../lib/useInventory";
import { toastError, toastSuccess } from "../../lib/toast";
import { formatInventorySelectOptionLabel } from "../../lib/stockUtils";

type EventStockReserveProps = {
  eventId: string;
  defaultUserName: string;
};

export default function EventStockReserve(props: EventStockReserveProps) {
  const { eventId, defaultUserName } = props;
  const { items, loading, recordMovement } = useInventory();
  const [itemId, setItemId] = useState<string>("");
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState("Réservation salon");
  const [userName, setUserName] = useState(defaultUserName);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setUserName(defaultUserName);
  }, [defaultUserName]);

  const selected = useMemo(() => items.find((i) => i.id === itemId), [items, itemId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId) {
      toastError("Choisissez un article en stock.");
      return;
    }
    const n = Math.max(1, Math.round(Number(qty) || 0));
    if (!userName.trim()) {
      toastError("Indiquez votre nom.");
      return;
    }
    if (selected && n > selected.quantity) {
      toastError("Quantité supérieure au stock disponible.");
      return;
    }
    setSubmitting(true);
    try {
      await recordMovement({
        itemId,
        changeAmount: -n,
        projectId: null,
        eventId,
        reason: reason.trim() || "Sortie stock événement",
        userName: userName.trim(),
      });
      toastSuccess("Sortie de stock imputée à l'événement");
      setQty("1");
    } catch (err) {
      toastError(getInventoryErrorMessage(err, "Mouvement impossible."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-[22px] border border-[var(--line)] bg-[var(--surface)] p-5">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--foreground)]/65">
        <Package className="h-3.5 w-3.5" />
        Réserver du matériel (sortie stock)
      </div>
      <p className="mb-4 text-sm text-[color:var(--foreground)]/60">
        Chaque sortie est enregistrée dans l&apos;historique stock et valorisée pour le budget événement (prix unitaire au moment du mouvement).
      </p>
      {loading ? (
        <p className="text-sm text-[color:var(--foreground)]/55">Chargement du stock…</p>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Article</label>
            <select
              value={itemId}
              onChange={(ev) => setItemId(ev.target.value)}
              className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2.5 text-sm"
            >
              <option value="">— Sélectionner —</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {formatInventorySelectOptionLabel(it)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Quantité à sortir</label>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(ev) => setQty(ev.target.value)}
              className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Réalisé par</label>
            <input
              value={userName}
              onChange={(ev) => setUserName(ev.target.value)}
              className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2.5 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Commentaire</label>
            <input
              value={reason}
              onChange={(ev) => setReason(ev.target.value)}
              className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2.5 text-sm"
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting || !itemId}
              className="ui-transition rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[#fffdf9] shadow-sm hover:bg-[var(--accent-strong)] disabled:opacity-50"
            >
              {submitting ? "Enregistrement…" : "Enregistrer la sortie"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
