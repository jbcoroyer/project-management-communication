"use client";

import { useEffect, useMemo, useState } from "react";
import { Image as ImageIcon, Trash2, Upload, X } from "lucide-react";
import { getSupabaseBrowser } from "../lib/supabaseBrowser";
import type { InventoryItem, InventoryItemDraft } from "../lib/inventoryTypes";
import { toastError } from "../lib/toast";

type Props = {
  open: boolean;
  initialItem: InventoryItem | null;
  allItems: InventoryItem[];
  onClose: () => void;
  onSubmit: (draft: InventoryItemDraft) => Promise<void> | void;
  onDelete?: (item: InventoryItem) => Promise<void> | void;
};

const OTHER_TYPE = "__autre__";

export default function InventoryPlvModal(props: Props) {
  const { open, initialItem, allItems, onClose, onSubmit, onDelete } = props;
  const isEditing = Boolean(initialItem?.id);
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const typeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          allItems
            .filter((item) => item.category === "PLV")
            .map((item) => item.itemType.trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, "fr")),
    [allItems],
  );

  const [typeSelect, setTypeSelect] = useState("");
  const [customType, setCustomType] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [unitPrice, setUnitPrice] = useState("0");
  const [alertThreshold, setAlertThreshold] = useState("0");
  const [visualUrl, setVisualUrl] = useState("");
  const [visualFile, setVisualFile] = useState<File | null>(null);
  const [visualPreviewUrl, setVisualPreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const source = initialItem;
    const sourceType = source?.itemType?.trim() ?? "";
    const inList = sourceType.length > 0 && typeOptions.includes(sourceType);
    if (sourceType) {
      setTypeSelect(inList ? sourceType : OTHER_TYPE);
      setCustomType(inList ? "" : sourceType);
    } else {
      setTypeSelect(typeOptions[0] ?? OTHER_TYPE);
      setCustomType("");
    }
    setName(source?.name ?? "");
    setQuantity(String(source?.quantity ?? 0));
    setUnitPrice(String(source?.unitPrice ?? 0));
    setAlertThreshold(String(source?.alertThreshold ?? 0));
    setVisualUrl(source?.visualUrl ?? "");
    setVisualFile(null);
    setVisualPreviewUrl(null);
  }, [open, initialItem, typeOptions]);

  useEffect(() => {
    return () => {
      if (visualPreviewUrl) URL.revokeObjectURL(visualPreviewUrl);
    };
  }, [visualPreviewUrl]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toastError("Le nom est obligatoire.");
      return;
    }
    const resolvedType = (typeSelect === OTHER_TYPE ? customType : typeSelect).trim();
    if (!resolvedType) {
      toastError("Le type de PLV est obligatoire.");
      return;
    }

    setSubmitting(true);
    try {
      let resolvedVisualUrl = visualUrl.trim() || null;
      if (visualFile) {
        const extRaw = visualFile.name.split(".").pop() ?? "png";
        const ext = extRaw.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "png";
        const path = `plv/${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("stock-plv-visuals")
          .upload(path, visualFile, { upsert: true, contentType: visualFile.type });
        if (upErr) {
          toastError(`Upload image impossible : ${upErr.message}`);
          return;
        }
        const { data: urlData } = supabase.storage.from("stock-plv-visuals").getPublicUrl(path);
        resolvedVisualUrl = urlData.publicUrl;
      }

      await onSubmit({
        id: initialItem?.id,
        category: "PLV",
        itemType: resolvedType,
        name: name.trim(),
        quantity: Math.max(0, Math.round(Number(quantity) || 0)),
        unitPrice: Math.max(0, Number(unitPrice.replace(",", ".")) || 0),
        alertThreshold: Math.max(0, Math.round(Number(alertThreshold) || 0)),
        language: null,
        visualUrl: resolvedVisualUrl,
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
      <div className="ui-surface max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/50">PLV</p>
            <h2 className="ui-heading mt-1 text-2xl font-semibold text-[var(--foreground)]">
              {isEditing ? "Modifier un support PLV" : "Ajouter un support PLV"}
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Type de support</label>
              <select
                value={typeSelect}
                onChange={(event) => setTypeSelect(event.target.value)}
                className="ui-focus-ring mb-2 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              >
                {typeOptions.map((typeName) => (
                  <option key={typeName} value={typeName}>
                    {typeName}
                  </option>
                ))}
                <option value={OTHER_TYPE}>Autre (saisie libre)…</option>
              </select>
              {typeSelect === OTHER_TYPE && (
                <input
                  value={customType}
                  onChange={(event) => setCustomType(event.target.value)}
                  className="ui-focus-ring w-full rounded-xl border border-[var(--line)]/85 bg-[var(--surface-soft)] px-3 py-2.5 text-sm"
                  placeholder="Nouveau type — il sera proposé dans la liste la prochaine fois"
                />
              )}
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Nom</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
                placeholder="Nom exact du visuel"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Quantité</label>
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Seuil d&apos;alerte</label>
              <input
                type="number"
                min="0"
                value={alertThreshold}
                onChange={(event) => setAlertThreshold(event.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Prix unitaire</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(event) => setUnitPrice(event.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">URL image (optionnel)</label>
              <input
                value={visualUrl}
                onChange={(event) => setVisualUrl(event.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
                placeholder="https://..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Importer une photo</label>
              <label className="ui-transition flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-3 py-4 text-sm font-medium text-[color:var(--foreground)]/70 hover:border-[var(--line-strong)]">
                <Upload className="h-4 w-4" />
                Choisir un fichier image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (visualPreviewUrl) URL.revokeObjectURL(visualPreviewUrl);
                    setVisualFile(file);
                    setVisualPreviewUrl(file ? URL.createObjectURL(file) : null);
                  }}
                />
              </label>
            </div>
          </div>

          {(visualPreviewUrl || visualUrl) && (
            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground)]/55">Aperçu visuel</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={visualPreviewUrl ?? visualUrl}
                alt="Aperçu du visuel PLV"
                className="h-52 w-full rounded-lg border border-[var(--line)] object-contain bg-white"
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
            <div>
              {isEditing && initialItem && onDelete && (
                <button
                  type="button"
                  onClick={() => void onDelete(initialItem)}
                  className="ui-transition inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
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
                className="ui-transition inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#fffdf9] shadow-sm hover:bg-[var(--accent-strong)] disabled:opacity-60"
              >
                <ImageIcon className="h-4 w-4" />
                {submitting ? "Enregistrement..." : isEditing ? "Mettre à jour" : "Créer"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
