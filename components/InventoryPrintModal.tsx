"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { printDocumentTypeOptions } from "../lib/printDocumentTypes";
import { PRINT_LANGUAGES_FR, PRINT_LANGUAGES_FEATURED_FR } from "../lib/printLanguages";
import type { InventoryItem, InventoryItemDraft } from "../lib/inventoryTypes";
import { toastError } from "../lib/toast";

type Props = {
  open: boolean;
  initialItem: InventoryItem | null;
  allItems: InventoryItem[];
  onClose: () => void;
  onSubmit: (draft: InventoryItemDraft) => Promise<void> | void;
  /** Création : plusieurs lignes (une par langue) en une fois. */
  onSubmitMany?: (drafts: InventoryItemDraft[]) => Promise<void> | void;
  onDelete?: (item: InventoryItem) => Promise<void> | void;
};

const OTHER_DOC = "__autre__";

type LangRow = {
  key: string;
  language: string;
  quantity: string;
  unitPrice: string;
  alertThreshold: string;
};

function newLangRow(partial?: Partial<LangRow>): LangRow {
  return {
    key: typeof crypto !== "undefined" ? crypto.randomUUID() : `row-${Date.now()}-${Math.random()}`,
    language: partial?.language ?? "Français",
    quantity: partial?.quantity ?? "0",
    unitPrice: partial?.unitPrice ?? "0",
    alertThreshold: partial?.alertThreshold ?? "0",
  };
}

export default function InventoryPrintModal(props: Props) {
  const { open, initialItem, allItems, onClose, onSubmit, onSubmitMany, onDelete } = props;
  const isEditing = Boolean(initialItem?.id);

  const docOptions = useMemo(() => printDocumentTypeOptions(allItems), [allItems]);
  const restLang = useMemo(() => {
    const featured = new Set<string>(PRINT_LANGUAGES_FEATURED_FR);
    return PRINT_LANGUAGES_FR.filter((l) => !featured.has(l));
  }, []);

  const [docSelect, setDocSelect] = useState("");
  const [customDocType, setCustomDocType] = useState("");
  const [language, setLanguage] = useState("Français");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [unitPrice, setUnitPrice] = useState("0");
  const [alertThreshold, setAlertThreshold] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [langRows, setLangRows] = useState<LangRow[]>(() => [newLangRow()]);

  useEffect(() => {
    if (!open) return;
    const source = initialItem;
    if (source) {
      const t = source.itemType?.trim() ?? "";
      const inList = docOptions.includes(t);
      setDocSelect(inList ? t : OTHER_DOC);
      setCustomDocType(inList ? "" : t);
      setLanguage(source.language?.trim() || "Français");
      setName(source.name);
      setQuantity(String(source.quantity));
      setUnitPrice(String(source.unitPrice));
      setAlertThreshold(String(source.alertThreshold));
    } else {
      setDocSelect(docOptions[0] ?? "Fiches Commerciales");
      setCustomDocType("");
      setLanguage("Français");
      setName("");
      setQuantity("0");
      setUnitPrice("0");
      setAlertThreshold("0");
      setLangRows([newLangRow()]);
    }
  }, [open, initialItem, docOptions]);

  if (!open) return null;

  const resolvedDocType = (): string => {
    if (docSelect === OTHER_DOC) return customDocType.trim();
    return docSelect.trim();
  };

  const parsePrice = (v: string) => Math.max(0, Number(v.replace(",", ".")) || 0);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const doc = resolvedDocType();
    if (!doc) {
      toastError("Le type de document est obligatoire (choisissez dans la liste ou saisissez un type personnalisé).");
      return;
    }
    if (!name.trim()) {
      toastError("Le nom du document est obligatoire.");
      return;
    }

    if (isEditing) {
      if (!language.trim()) {
        toastError("La langue est obligatoire.");
        return;
      }
      setSubmitting(true);
      try {
        await onSubmit({
          id: initialItem?.id,
          category: "Print",
          itemType: doc,
          name: name.trim(),
          quantity: Math.max(0, Math.round(Number(quantity) || 0)),
          unitPrice: parsePrice(unitPrice),
          alertThreshold: Math.max(0, Math.round(Number(alertThreshold) || 0)),
          language: language.trim(),
        });
        onClose();
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const drafts: InventoryItemDraft[] = [];
    const seenLang = new Set<string>();
    for (const row of langRows) {
      const lang = row.language.trim();
      if (!lang) continue;
      const key = lang.toLowerCase();
      if (seenLang.has(key)) {
        toastError(`La langue « ${lang} » est indiquée plusieurs fois.`);
        return;
      }
      seenLang.add(key);
      drafts.push({
        category: "Print",
        itemType: doc,
        name: name.trim(),
        quantity: Math.max(0, Math.round(Number(row.quantity) || 0)),
        unitPrice: parsePrice(row.unitPrice),
        alertThreshold: Math.max(0, Math.round(Number(row.alertThreshold) || 0)),
        language: lang,
      });
    }
    if (drafts.length === 0) {
      toastError("Ajoutez au moins une langue avec une ligne renseignée.");
      return;
    }

    setSubmitting(true);
    try {
      if (drafts.length > 1 && onSubmitMany) {
        await onSubmitMany(drafts);
      } else {
        await onSubmit(drafts[0]!);
      }
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/50">Print</p>
            <h2 className="ui-heading mt-1 text-2xl font-semibold text-[var(--foreground)]">
              {isEditing ? "Modifier un document" : "Ajouter un document"}
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
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">
                Type de document
              </label>
              <select
                value={docSelect}
                onChange={(e) => setDocSelect(e.target.value)}
                className="ui-focus-ring mb-2 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
              >
                {docOptions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
                <option value={OTHER_DOC}>Autre (saisie libre)…</option>
              </select>
              {docSelect === OTHER_DOC && (
                <input
                  value={customDocType}
                  onChange={(e) => setCustomDocType(e.target.value)}
                  className="ui-focus-ring w-full rounded-xl border border-[var(--line)]/85 bg-[var(--surface-soft)] px-3 py-2.5 text-sm"
                  placeholder="Nouveau type — apparaîtra dans la liste pour les prochains documents"
                />
              )}
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Nom du document</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
                placeholder="Référence ou libellé interne (identique pour toutes les langues)"
              />
            </div>

            {isEditing ? (
              <>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Langue</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
                  >
                    <optgroup label="Principales">
                      {PRINT_LANGUAGES_FEATURED_FR.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Autres langues (les plus parlées)">
                      {restLang.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </optgroup>
                  </select>
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
                  <label className="mb-1 block text-xs font-semibold text-[color:var(--foreground)]/65">Seuil d&apos;alerte</label>
                  <input
                    type="number"
                    min="0"
                    value={alertThreshold}
                    onChange={(event) => setAlertThreshold(event.target.value)}
                    className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm"
                  />
                </div>
              </>
            ) : (
              <div className="md:col-span-2 space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <label className="block text-xs font-semibold text-[color:var(--foreground)]/65">
                    Langues et quantités (une ligne par langue — même document)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const base = langRows[0];
                      setLangRows((rows) => [
                        ...rows,
                        newLangRow({
                          unitPrice: base?.unitPrice ?? "0",
                          alertThreshold: base?.alertThreshold ?? "0",
                          language: "Anglais",
                        }),
                      ]);
                    }}
                    className="ui-transition inline-flex items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1.5 text-xs font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface)]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Ajouter une langue
                  </button>
                </div>
                <div className="space-y-3 rounded-[20px] border border-[var(--line)] bg-[var(--surface-soft)]/40 p-4">
                  {langRows.map((row) => (
                    <div
                      key={row.key}
                      className="grid gap-3 border-b border-[var(--line)] pb-3 last:border-b-0 last:pb-0 md:grid-cols-12 md:items-end"
                    >
                      <div className="md:col-span-4">
                        <label className="mb-1 block text-[11px] font-semibold text-[color:var(--foreground)]/55">Langue</label>
                        <select
                          value={row.language}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLangRows((rows) => rows.map((r) => (r.key === row.key ? { ...r, language: v } : r)));
                          }}
                          className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                        >
                          <optgroup label="Principales">
                            {PRINT_LANGUAGES_FEATURED_FR.map((l) => (
                              <option key={l} value={l}>
                                {l}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Autres langues (les plus parlées)">
                            {restLang.map((l) => (
                              <option key={l} value={l}>
                                {l}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-[11px] font-semibold text-[color:var(--foreground)]/55">Quantité</label>
                        <input
                          type="number"
                          min="0"
                          value={row.quantity}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLangRows((rows) => rows.map((r) => (r.key === row.key ? { ...r, quantity: v } : r)));
                          }}
                          className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-[11px] font-semibold text-[color:var(--foreground)]/55">Prix unit.</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.unitPrice}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLangRows((rows) => rows.map((r) => (r.key === row.key ? { ...r, unitPrice: v } : r)));
                          }}
                          className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-[11px] font-semibold text-[color:var(--foreground)]/55">Seuil alerte</label>
                        <input
                          type="number"
                          min="0"
                          value={row.alertThreshold}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLangRows((rows) => rows.map((r) => (r.key === row.key ? { ...r, alertThreshold: v } : r)));
                          }}
                          className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="flex items-end justify-end md:col-span-2">
                        {langRows.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => setLangRows((rows) => rows.filter((r) => r.key !== row.key))}
                            className="ui-transition rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                          >
                            Retirer
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

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
                className="ui-transition rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#fffdf9] shadow-sm hover:bg-[var(--accent-strong)] disabled:opacity-60"
              >
                {submitting
                  ? "Enregistrement..."
                  : isEditing
                    ? "Mettre à jour"
                    : langRows.length > 1
                      ? `Créer (${langRows.length} langues)`
                      : "Créer"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
