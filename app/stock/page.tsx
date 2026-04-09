"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  Gift,
  Image as ImageIcon,
  Minus,
  Package,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import AppShell from "../../components/AppShell";
import InventoryGoodiesModal from "../../components/InventoryGoodiesModal";
import InventoryPlvModal from "../../components/InventoryPlvModal";
import InventoryPrintModal from "../../components/InventoryPrintModal";
import InventoryReorderModal from "../../components/InventoryReorderModal";
import StockMovementModal from "../../components/StockMovementModal";
import StockSectionNav from "../../components/StockSectionNav";
import { toastError, toastSuccess } from "../../lib/toast";
import { useCurrentUser } from "../../lib/useCurrentUser";
import {
  inventoryCategories,
  inventoryItemValue,
  isLowStock,
  normalizeInventoryItemType,
  type InventoryCategory,
  type InventoryItem,
  type InventoryItemDraft,
} from "../../lib/inventoryTypes";
import { getInventoryErrorMessage, useInventory } from "../../lib/useInventory";
import { useStockProjects } from "../../lib/useStockProjects";
import { formatCurrency, formatNumber } from "../../lib/stockUtils";

/** Même document print = même type + même nom (regroupe les langues). */
type PrintDocTypeGroup = {
  docType: string;
  documents: { name: string; items: InventoryItem[] }[];
};

function groupPrintByDocTypeAndName(sectionItems: InventoryItem[]): PrintDocTypeGroup[] {
  const byDoc = new Map<string, InventoryItem[]>();
  for (const item of sectionItems) {
    const doc = item.itemType?.trim() || "—";
    if (!byDoc.has(doc)) byDoc.set(doc, []);
    byDoc.get(doc)!.push(item);
  }
  const docTypes = Array.from(byDoc.keys()).sort((a, b) => a.localeCompare(b, "fr"));
  return docTypes.map((docType) => {
    const raw = byDoc.get(docType)!;
    const byName = new Map<string, InventoryItem[]>();
    for (const item of raw) {
      const n = item.name.trim() || "—";
      if (!byName.has(n)) byName.set(n, []);
      byName.get(n)!.push(item);
    }
    const documents = Array.from(byName.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "fr"))
      .map(([name, its]) => ({
        name,
        items: [...its].sort((a, b) => (a.language ?? "").localeCompare(b.language ?? "", "fr")),
      }));
    return { docType, documents };
  });
}

export default function StockPage() {
  const { user: currentUser } = useCurrentUser();
  const {
    items,
    loading,
    loadItems,
    createItem,
    updateItem,
    updateLastQuoteInfo,
    recordMovement,
    deleteItem,
  } = useInventory();
  const { projects } = useStockProjects();

  const [searchQuery, setSearchQuery] = useState("");
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [goodiesModalOpen, setGoodiesModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [reorderItem, setReorderItem] = useState<InventoryItem | null>(null);
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);
  const [movementMode, setMovementMode] = useState<"add" | "remove">("remove");
  const [printSectionExpanded, setPrintSectionExpanded] = useState(true);
  const [goodiesSectionExpanded, setGoodiesSectionExpanded] = useState(true);
  const [plvSectionExpanded, setPlvSectionExpanded] = useState(true);
  const [plvModalOpen, setPlvModalOpen] = useState(false);
  const [plvLightbox, setPlvLightbox] = useState<{ url: string; name: string } | null>(null);
  const [collapsedPlvTypes, setCollapsedPlvTypes] = useState<Record<string, boolean>>({});

  const totalStockValue = useMemo(
    () => items.reduce((sum, item) => sum + inventoryItemValue(item), 0),
    [items],
  );

  const categoryStats = useMemo(
    () =>
      Object.fromEntries(
        inventoryCategories.map((category) => [
          category,
          {
            count: items.filter((item) => item.category === category).length,
            alertCount: items.filter((item) => item.category === category && isLowStock(item)).length,
          },
        ]),
      ) as Record<InventoryCategory, { count: number; alertCount: number }>,
    [items],
  );

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (!query) return true;
      const haystack = [item.name, item.itemType, item.lastQuoteInfo, item.language]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [items, searchQuery]);

  const filteredItemsByCategory = useMemo(
    () =>
      Object.fromEntries(
        inventoryCategories.map((category) => [
          category,
          filteredItems.filter((item) => item.category === category),
        ]),
      ) as Record<InventoryCategory, InventoryItem[]>,
    [filteredItems],
  );

  const openEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    if (item.category === "Print") {
      setPrintModalOpen(true);
    } else if (item.category === "PLV") {
      setPlvModalOpen(true);
    } else {
      setGoodiesModalOpen(true);
    }
  };

  const toolbarRight = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void loadItems().catch(() => undefined)}
        className="ui-transition inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
      >
        <RefreshCcw className="h-4 w-4" />
        Actualiser
      </button>
      <button
        type="button"
        onClick={() => {
          setEditingItem(null);
          setPrintModalOpen(true);
        }}
        className="ui-transition inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#fffdf9] shadow-sm hover:bg-[var(--accent-strong)]"
      >
        <FileText className="h-4 w-4" />
        Ajouter un document
      </button>
      <button
        type="button"
        onClick={() => {
          setEditingItem(null);
          setGoodiesModalOpen(true);
        }}
        className="ui-transition inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
      >
        <Gift className="h-4 w-4" />
        Ajouter un goodies
      </button>
      <button
        type="button"
        onClick={() => {
          setEditingItem(null);
          setPlvModalOpen(true);
        }}
        className="ui-transition inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
      >
        <ImageIcon className="h-4 w-4" />
        Ajouter un support PLV
      </button>
    </div>
  );

  const searchSlot = (
    <div className="flex min-w-[260px] flex-1 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
      <Search className="h-4 w-4 text-[color:var(--foreground)]/45" />
      <input
        type="text"
        placeholder="Rechercher (nom, type, langue, devis…)"
        aria-label="Recherche stock"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        className="ui-focus-ring w-full rounded-md bg-transparent text-sm text-[var(--foreground)] placeholder:text-[color:var(--foreground)]/45 focus:outline-none"
      />
    </div>
  );

  const handleSaveItem = async (draft: InventoryItemDraft) => {
    try {
      if (draft.id) {
        const { id, ...payload } = draft;
        await updateItem(id, payload);
        toastSuccess("Article mis à jour");
        return;
      }
      await createItem(draft);
      toastSuccess("Article créé");
    } catch (error) {
      toastError(getInventoryErrorMessage(error, "Impossible d'enregistrer l'article."));
    }
  };

  const handleSavePrintMany = async (drafts: InventoryItemDraft[]) => {
    try {
      for (const draft of drafts) {
        await createItem(draft);
      }
      toastSuccess(
        drafts.length > 1
          ? `${drafts.length} références créées pour ce document (une par langue).`
          : "Article créé",
      );
    } catch (error) {
      toastError(getInventoryErrorMessage(error, "Impossible d'enregistrer les articles."));
    }
  };

  const handleDeleteItem = async (item: InventoryItem) => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(`Supprimer l'article « ${item.name} » ?`);
      if (!confirmed) return;
    }
    try {
      await deleteItem(item.id);
      toastSuccess("Article supprimé");
      setPrintModalOpen(false);
      setGoodiesModalOpen(false);
      setPlvModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      toastError(getInventoryErrorMessage(error, "Impossible de supprimer l'article."));
    }
  };

  const handleRecordMovement = async (
    item: InventoryItem,
    payload: { changeAmount: number; projectId: string | null; reason: string | null; userName: string },
  ) => {
    try {
      await recordMovement({
        itemId: item.id,
        changeAmount: payload.changeAmount,
        projectId: payload.projectId,
        reason: payload.reason,
        userName: payload.userName,
      });
      toastSuccess(payload.changeAmount > 0 ? "Entrée de stock enregistrée" : "Sortie de stock enregistrée");
    } catch (error) {
      toastError(getInventoryErrorMessage(error, "Impossible d'enregistrer le mouvement de stock."));
    }
  };

  const handleSaveQuoteInfo = async (value: string) => {
    if (!reorderItem) return;
    try {
      await updateLastQuoteInfo(reorderItem.id, value);
      toastSuccess("Informations enregistrées");
    } catch (error) {
      toastError(getInventoryErrorMessage(error, "Impossible d'enregistrer les informations."));
    }
  };

  const renderItemRow = (item: InventoryItem) => {
    const lowStock = isLowStock(item);
    return (
      <tr key={item.id} className="border-t border-[var(--line)] bg-[var(--surface)] align-top">
        <td className="px-4 py-3">
          <div>
            <p className="font-semibold text-[var(--foreground)]">{item.name}</p>
            {item.lastQuoteInfo && (
              <p className="mt-1 line-clamp-1 text-xs text-[color:var(--foreground)]/55">{item.lastQuoteInfo}</p>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex min-w-[min(100%,280px)] flex-row flex-wrap items-center gap-x-3 gap-y-2">
            <p className="shrink-0 text-sm font-semibold text-[var(--foreground)]">{formatNumber(item.quantity)}</p>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMovementItem(item);
                  setMovementMode("add");
                }}
                className="ui-transition inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                <Plus className="h-4 w-4" />
                Entrée
              </button>
              <button
                type="button"
                onClick={() => {
                  setMovementItem(item);
                  setMovementMode("remove");
                }}
                className="ui-transition inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
              >
                <Minus className="h-4 w-4" />
                Sortie
              </button>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm font-medium text-[var(--foreground)]">{formatCurrency(item.unitPrice)}</td>
        <td className="px-4 py-3 text-sm font-semibold text-[var(--foreground)]">
          {formatCurrency(inventoryItemValue(item))}
        </td>
        <td className="px-4 py-3">
          <span
            className={[
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
              lowStock
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700",
            ].join(" ")}
          >
            {lowStock ? <AlertTriangle className="h-3.5 w-3.5" /> : null}
            {lowStock ? "À recommander" : "Stock OK"}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openEditItem(item)}
              className="ui-transition inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[color:var(--foreground)]/70 hover:bg-[var(--surface)]"
            >
              <Pencil className="h-4 w-4" />
              Modifier
            </button>
            <button
              type="button"
              onClick={() => setReorderItem(item)}
              className={[
                "ui-transition rounded-xl px-3 py-2 text-sm font-semibold",
                lowStock
                  ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                  : "border border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/70 hover:bg-[var(--surface)]",
              ].join(" ")}
            >
              Infos
            </button>
            <button
              type="button"
              onClick={() => void handleDeleteItem(item)}
              className="ui-transition inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100"
              title="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  /** Lignes print regroupées par document (même nom + type) : nom en rowspan, langues collées visuellement. */
  const renderPrintDocumentRows = (docItems: InventoryItem[]) => {
    const n = docItems.length;
    return docItems.map((item, idx) => {
      const lowStock = isLowStock(item);
      const isFirst = idx === 0;
      return (
        <tr
          key={item.id}
          className={[
            "border-t border-[var(--line)] bg-[var(--surface)] align-top",
            idx === 0 ? "bg-[var(--surface-soft)]" : "bg-[var(--surface)]",
          ].join(" ")}
        >
          {isFirst ? (
            <td
              rowSpan={n}
              className="border-l-[3px] border-l-[var(--line-strong)] bg-[var(--surface-soft)]/50 px-4 py-3 align-top"
            >
              <p className="font-semibold text-[var(--foreground)]">{item.name}</p>
              {item.lastQuoteInfo ? (
                <p className="mt-1 line-clamp-2 text-xs text-[color:var(--foreground)]/55">{item.lastQuoteInfo}</p>
              ) : null}
            </td>
          ) : null}
          <td className="px-4 py-3 text-sm text-[color:var(--foreground)]/85">
            <span className="font-medium">{item.language ?? "—"}</span>
            {!isFirst && item.lastQuoteInfo ? (
              <p className="mt-1 line-clamp-2 text-xs text-[color:var(--foreground)]/50">{item.lastQuoteInfo}</p>
            ) : null}
          </td>
          <td className="px-4 py-3">
            <div className="flex min-w-[min(100%,280px)] flex-row flex-wrap items-center gap-x-3 gap-y-2">
              <p className="shrink-0 text-sm font-semibold text-[var(--foreground)]">{formatNumber(item.quantity)}</p>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMovementItem(item);
                    setMovementMode("add");
                  }}
                  className="ui-transition inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  <Plus className="h-4 w-4" />
                  Entrée
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMovementItem(item);
                    setMovementMode("remove");
                  }}
                  className="ui-transition inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
                >
                  <Minus className="h-4 w-4" />
                  Sortie
                </button>
              </div>
            </div>
          </td>
          <td className="px-4 py-3 text-sm font-medium text-[var(--foreground)]">{formatCurrency(item.unitPrice)}</td>
          <td className="px-4 py-3 text-sm font-semibold text-[var(--foreground)]">
            {formatCurrency(inventoryItemValue(item))}
          </td>
          <td className="px-4 py-3">
            <span
              className={[
                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
                lowStock
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700",
              ].join(" ")}
            >
              {lowStock ? <AlertTriangle className="h-3.5 w-3.5" /> : null}
              {lowStock ? "À recommander" : "Stock OK"}
            </span>
          </td>
          <td className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openEditItem(item)}
                className="ui-transition inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm font-semibold text-[color:var(--foreground)]/70 hover:bg-[var(--surface)]"
              >
                <Pencil className="h-4 w-4" />
                Modifier
              </button>
              <button
                type="button"
                onClick={() => setReorderItem(item)}
                className={[
                  "ui-transition rounded-xl px-3 py-2 text-sm font-semibold",
                  lowStock
                    ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                    : "border border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/70 hover:bg-[var(--surface)]",
                ].join(" ")}
              >
                Infos
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteItem(item)}
                className="ui-transition inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100"
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </td>
        </tr>
      );
    });
  };

  const renderTableHead = (category: InventoryCategory) => (
    <thead className="bg-[var(--surface-soft)]">
      <tr className="text-left text-xs uppercase tracking-[0.14em] text-[color:var(--foreground)]/50">
        <th className="px-4 py-3">Nom</th>
        {category === "Print" ? <th className="px-4 py-3">Langue</th> : null}
        <th className="px-4 py-3">Quantité</th>
        <th className="px-4 py-3">Prix unitaire</th>
        <th className="px-4 py-3">Valeur totale</th>
        <th className="px-4 py-3">Statut</th>
        <th className="px-4 py-3">Actions</th>
      </tr>
    </thead>
  );

  const renderCategorySection = (
    category: InventoryCategory,
    sectionCollapse: { expanded: boolean; onToggle: () => void },
  ) => {
    const sectionItems = filteredItemsByCategory[category];
    const Icon = category === "Print" ? Package : category === "PLV" ? ImageIcon : Gift;
    const stats = categoryStats[category];
    const sectionValue = sectionItems.reduce((sum, item) => sum + inventoryItemValue(item), 0);

    const goodiesGrouped =
      category === "Goodies"
        ? Object.entries(
            sectionItems.reduce<Record<string, InventoryItem[]>>((acc, item) => {
              const key = normalizeInventoryItemType("Goodies", item.itemType);
              if (!acc[key]) acc[key] = [];
              acc[key].push(item);
              return acc;
            }, {}),
          ).sort((a, b) => a[0].localeCompare(b[0], "fr"))
        : null;

    const printGroups = category === "Print" ? groupPrintByDocTypeAndName(sectionItems) : null;
    const plvGroups =
      category === "PLV"
        ? Object.entries(
            sectionItems.reduce<Record<string, InventoryItem[]>>((acc, item) => {
              const key = item.itemType?.trim() || "Autres supports";
              if (!acc[key]) acc[key] = [];
              acc[key].push(item);
              return acc;
            }, {}),
          )
            .sort((a, b) => a[0].localeCompare(b[0], "fr"))
            .map(([typeLabel, typeItems]) => [typeLabel, [...typeItems].sort((a, b) => a.name.localeCompare(b.name, "fr"))] as const)
        : null;

    const body =
      loading ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-12 text-center text-sm text-[color:var(--foreground)]/55">
          Chargement du stock...
        </div>
      ) : sectionItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-12 text-center text-sm text-[color:var(--foreground)]/55">
          Aucun article dans cette catégorie.
        </div>
      ) : category === "Print" && printGroups ? (
          <div className="space-y-4">
            {printGroups.map(({ docType, documents }) => (
              <div key={docType} className="overflow-hidden rounded-2xl border border-[var(--line)]">
                <div className="border-b border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Type de document : {docType}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-[720px] w-full border-collapse [&_tbody+tbody]:border-t-2 [&_tbody+tbody]:border-[var(--line)]/85">
                    {renderTableHead("Print")}
                    {documents.map(({ name, items: docItems }) => (
                      <tbody key={`${docType}-${name}-${docItems.map((i) => i.id).join("-")}`}>
                        {renderPrintDocumentRows(docItems)}
                      </tbody>
                    ))}
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : category === "PLV" && plvGroups ? (
          <div className="space-y-4">
            {plvGroups.map(([typeLabel, typeItems]) => {
              const isCollapsed = collapsedPlvTypes[typeLabel] ?? false;
              return (
                <div key={`plv-${typeLabel}`} className="overflow-hidden rounded-2xl border border-[var(--line)]">
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedPlvTypes((prev) => ({ ...prev, [typeLabel]: !isCollapsed }))
                    }
                    className="flex w-full items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface-soft)] px-4 py-2.5 text-left"
                  >
                    <div className="flex items-center gap-2">
                      {isCollapsed ? <ChevronRight className="h-4 w-4 text-[color:var(--foreground)]/55" /> : <ChevronDown className="h-4 w-4 text-[color:var(--foreground)]/55" />}
                      <p className="text-sm font-semibold text-[var(--foreground)]">{typeLabel}</p>
                    </div>
                    <span className="text-xs font-semibold text-[color:var(--foreground)]/55">
                      {formatNumber(typeItems.length)} réf.
                    </span>
                  </button>
                  {!isCollapsed && (
                    <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
                      {typeItems.map((item) => {
                        const lowStock = isLowStock(item);
                        return (
                          <article key={item.id} className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
                            <div className="mb-2 h-40 w-full overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface-soft)]">
                              {item.visualUrl ? (
                                <button
                                  type="button"
                                  onClick={() => setPlvLightbox({ url: item.visualUrl!, name: item.name })}
                                  className="h-full w-full"
                                  title="Afficher l'image en grand"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={item.visualUrl} alt={item.name} className="h-full w-full object-cover transition hover:scale-[1.02]" />
                                </button>
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs text-[color:var(--foreground)]/45">
                                  Aucun visuel
                                </div>
                              )}
                            </div>
                            <p className="truncate text-sm font-semibold text-[var(--foreground)]">{item.name}</p>
                            <p className="mt-0.5 truncate text-xs text-[color:var(--foreground)]/55">{item.itemType || "Support PLV"}</p>
                            <div className="mt-2 flex items-center justify-between text-xs">
                              <span className="font-semibold text-[var(--foreground)]">Qté: {formatNumber(item.quantity)}</span>
                              <span className="text-[color:var(--foreground)]/65">{formatCurrency(item.unitPrice)}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setMovementItem(item);
                                  setMovementMode("add");
                                }}
                                className="ui-transition inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Entrée
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMovementItem(item);
                                  setMovementMode("remove");
                                }}
                                className="ui-transition inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                              >
                                <Minus className="h-3.5 w-3.5" />
                                Sortie
                              </button>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditItem(item)}
                                className="ui-transition inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-1 text-xs font-semibold text-[color:var(--foreground)]/70 hover:bg-[var(--surface)]"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Modifier
                              </button>
                              <button
                                type="button"
                                onClick={() => setReorderItem(item)}
                                className={[
                                  "ui-transition rounded-lg px-2 py-1 text-xs font-semibold",
                                  lowStock
                                    ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                                    : "border border-[var(--line)] bg-[var(--surface-soft)] text-[color:var(--foreground)]/70 hover:bg-[var(--surface)]",
                                ].join(" ")}
                              >
                                Infos
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteItem(item)}
                                className="ui-transition inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-100"
                                title="Supprimer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : goodiesGrouped ? (
          <div className="space-y-4">
            {goodiesGrouped.map(([groupLabel, groupItems]) => (
              <div key={`${category}-${groupLabel}`} className="overflow-hidden rounded-2xl border border-[var(--line)]">
                <div className="flex flex-nowrap items-center justify-between gap-3 overflow-x-auto border-b border-[var(--line)] bg-[var(--surface-soft)] px-4 py-2.5">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--foreground)]">
                    <span>{groupLabel}</span>
                    <span className="ml-2 font-normal text-[color:var(--foreground)]/55">
                      · {formatNumber(groupItems.length)} réf.
                    </span>
                  </p>
                  <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/45">
                      Qté totale
                    </span>
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {formatNumber(groupItems.reduce((sum, item) => sum + item.quantity, 0))}
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-[720px] w-full border-collapse">
                    {renderTableHead("Goodies")}
                    <tbody>{groupItems.map((item) => renderItemRow(item))}</tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : null;

    return (
      <section
        key={category}
        className={[
          "ui-surface overflow-hidden rounded-[24px]",
          category === "Print" ? "bg-[var(--surface-soft)]" : "",
        ].join(" ")}
      >
        <button
          type="button"
          onClick={sectionCollapse.onToggle}
          aria-expanded={sectionCollapse.expanded}
          className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-[var(--surface-soft)]/80 sm:gap-4 sm:px-5"
        >
          <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
            <span className="mt-0.5 shrink-0 text-[color:var(--foreground)]/55 sm:mt-0" aria-hidden>
              {sectionCollapse.expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Icon className="h-5 w-5 shrink-0 text-[color:var(--foreground)]/75" />
                <h2 className="text-xl font-semibold text-[var(--foreground)] sm:text-2xl">{category}</h2>
              </div>
              <p className="mt-1 text-sm text-[color:var(--foreground)]/60">
                {formatNumber(stats.count)} article(s), dont {formatNumber(stats.alertCount)} en alerte.
              </p>
            </div>
          </div>
          <div className="shrink-0 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-right sm:px-4 sm:py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/45">
              Valeur catégorie
            </p>
            <p className="mt-0.5 text-lg font-semibold text-[var(--foreground)] sm:text-xl">{formatCurrency(sectionValue)}</p>
          </div>
        </button>
        {sectionCollapse.expanded ? <div className="border-t border-[var(--line)] p-5">{body}</div> : null}
      </section>
    );
  };

  return (
    <AppShell
      toolbarRight={toolbarRight}
      searchSlot={searchSlot}
      currentUserName={currentUser?.displayName ?? currentUser?.teamMemberName ?? currentUser?.email}
      currentUserEmail={currentUser?.email}
      currentUserAvatarUrl={currentUser?.avatarUrl}
      currentUserJobTitle={currentUser?.jobTitle}
    >
      <section className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--foreground)]/75">
              <Package className="h-3.5 w-3.5" />
              Gestion de stock
            </div>
            <h1 className="ui-heading text-3xl font-semibold text-[var(--foreground)]">Stock Print, Goodies & PLV</h1>
            <p className="mt-2 max-w-3xl text-sm text-[color:var(--foreground)]/65">
              Documents print, goodies et supports PLV visuels. Alertes et mouvements.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/stock/history"
              className="ui-transition inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
            >
              Historique
            </Link>
            <Link
              href="/stock/dashboard"
              className="ui-transition inline-flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[color:var(--foreground)]/75 hover:bg-[var(--surface-soft)]"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <StockSectionNav />

        <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr_1fr]">
          <div className="ui-surface rounded-[24px] p-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--foreground)]/65">
              <Wallet className="h-3.5 w-3.5" />
              Valeur totale du stock
            </div>
            <p className="mt-4 text-4xl font-semibold text-[var(--foreground)]">{formatCurrency(totalStockValue)}</p>
            <p className="mt-2 text-sm text-[color:var(--foreground)]/60">
              Somme de tous les articles (quantité × prix unitaire).
            </p>
          </div>

          {inventoryCategories.map((category) => {
            const Icon = category === "Print" ? Package : category === "PLV" ? ImageIcon : Gift;
            const stats = categoryStats[category];
            return (
              <div
                key={category}
                className={[
                  "ui-surface rounded-[24px] p-5 text-left",
                  category === "Print" ? "bg-[var(--surface-soft)]" : "bg-[var(--surface)]",
                ].join(" ")}
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[color:var(--foreground)]/65">
                  <Icon className="h-3.5 w-3.5" />
                  {category}
                </div>
                <p className="mt-4 text-3xl font-semibold text-[var(--foreground)]">{formatNumber(stats.count)}</p>
                <p className="mt-1 text-sm text-[color:var(--foreground)]/60">article(s) dans cette catégorie</p>
                <p
                  className={[
                    "mt-3 text-sm font-semibold",
                    stats.alertCount > 0 ? "text-rose-700" : "text-emerald-700",
                  ].join(" ")}
                >
                  {stats.alertCount > 0 ? `${stats.alertCount} article(s) à recommander` : "Aucune alerte"}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-6">
          {renderCategorySection("Print", {
            expanded: printSectionExpanded,
            onToggle: () => setPrintSectionExpanded((v) => !v),
          })}
          {renderCategorySection("Goodies", {
            expanded: goodiesSectionExpanded,
            onToggle: () => setGoodiesSectionExpanded((v) => !v),
          })}
          {renderCategorySection("PLV", {
            expanded: plvSectionExpanded,
            onToggle: () => setPlvSectionExpanded((v) => !v),
          })}
        </div>
      </section>

      <InventoryPrintModal
        open={printModalOpen}
        initialItem={editingItem?.category === "Print" ? editingItem : null}
        allItems={items}
        onClose={() => {
          setPrintModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleSaveItem}
        onSubmitMany={handleSavePrintMany}
        onDelete={handleDeleteItem}
      />

      <InventoryGoodiesModal
        open={goodiesModalOpen}
        initialItem={editingItem?.category === "Goodies" ? editingItem : null}
        onClose={() => {
          setGoodiesModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleSaveItem}
        onDelete={handleDeleteItem}
      />

      <InventoryPlvModal
        open={plvModalOpen}
        initialItem={editingItem?.category === "PLV" ? editingItem : null}
        allItems={items}
        onClose={() => {
          setPlvModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleSaveItem}
        onDelete={handleDeleteItem}
      />

      <InventoryReorderModal
        open={Boolean(reorderItem)}
        item={reorderItem}
        onClose={() => setReorderItem(null)}
        onSubmit={handleSaveQuoteInfo}
      />

      <StockMovementModal
        open={Boolean(movementItem)}
        item={movementItem}
        mode={movementMode}
        projects={projects}
        defaultUserName={currentUser?.teamMemberName ?? currentUser?.displayName ?? null}
        onClose={() => setMovementItem(null)}
        onSubmit={async (payload) => {
          if (!movementItem) return;
          await handleRecordMovement(movementItem, payload);
        }}
      />

      {plvLightbox && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => event.target === event.currentTarget && setPlvLightbox(null)}
        >
          <div className="relative max-h-[92vh] w-full max-w-6xl rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3">
            <button
              type="button"
              onClick={() => setPlvLightbox(null)}
              className="ui-transition absolute right-3 top-3 z-10 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-2 text-[color:var(--foreground)]/70 hover:bg-[var(--surface)]"
              aria-label="Fermer le visuel"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="mb-2 text-sm font-semibold text-[var(--foreground)]">{plvLightbox.name}</p>
            <div className="max-h-[80vh] overflow-hidden rounded-xl border border-[var(--line)] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={plvLightbox.url} alt={plvLightbox.name} className="h-full max-h-[80vh] w-full object-contain" />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
