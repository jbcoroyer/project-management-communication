import type { InventoryItem } from "../inventoryTypes";
import type { StockMovement } from "../stockTypes";
import type { EventRow } from "../eventTypes";

const DAY_MS = 24 * 60 * 60 * 1000;

export type ReorderConfig = {
  /** Fenêtre d'analyse de la consommation passée (jours). */
  windowDays: number;
  /** Délai fournisseur estimé (jours) entre commande et réception. */
  leadTimeDays: number;
  /** Couverture de sécurité (jours) pour absorber les aléas. */
  safetyDays: number;
  /** Couverture cible visée après réassort (jours). */
  targetCoverDays: number;
};

export const DEFAULT_REORDER_CONFIG: ReorderConfig = {
  windowDays: 90,
  leadTimeDays: 14,
  safetyDays: 10,
  targetCoverDays: 60,
};

export type ReorderInsight = {
  item: InventoryItem;
  /** Consommation moyenne par jour (unités). */
  avgDailyUsage: number;
  /** Total consommé sur la fenêtre d'analyse. */
  consumedInWindow: number;
  /** Nombre de jours de couverture restants au rythme actuel. */
  daysOfCover: number | null;
  /** Point de commande calculé. */
  reorderPoint: number;
  /** Quantité de réassort suggérée. */
  suggestedOrderQty: number;
  /** true si la quantité est <= point de commande. */
  shouldReorder: boolean;
  /** Niveau d'urgence dérivé. */
  urgency: "ok" | "watch" | "reorder" | "critical";
};

/** Consommation (sorties) d'un article sur une fenêtre de temps, à partir des mouvements. */
function consumptionForItem(itemId: string, movements: StockMovement[], sinceTs: number): number {
  let consumed = 0;
  for (const m of movements) {
    if (m.itemId !== itemId) continue;
    const ts = new Date(m.createdAt).getTime();
    if (!Number.isFinite(ts) || ts < sinceTs) continue;
    if (m.changeAmount < 0) consumed += Math.abs(m.changeAmount);
  }
  return consumed;
}

export function computeReorderInsight(
  item: InventoryItem,
  movements: StockMovement[],
  config: ReorderConfig = DEFAULT_REORDER_CONFIG,
): ReorderInsight {
  const sinceTs = Date.now() - config.windowDays * DAY_MS;
  const consumedInWindow = consumptionForItem(item.id, movements, sinceTs);
  const avgDailyUsage = consumedInWindow / config.windowDays;

  const safetyStock = avgDailyUsage * config.safetyDays;
  // Point de commande : consommation pendant le délai fournisseur + stock de sécurité.
  // Repli sur le seuil d'alerte historique si aucune conso mesurée.
  const computedPoint = avgDailyUsage * config.leadTimeDays + safetyStock;
  const reorderPoint = Math.max(item.alertThreshold, Math.ceil(computedPoint));

  const daysOfCover = avgDailyUsage > 0 ? item.quantity / avgDailyUsage : null;

  const targetStock = avgDailyUsage * config.targetCoverDays;
  const suggestedOrderQty = Math.max(0, Math.ceil(targetStock + safetyStock - item.quantity));

  const shouldReorder = item.quantity <= reorderPoint;

  let urgency: ReorderInsight["urgency"] = "ok";
  if (item.quantity <= 0) urgency = "critical";
  else if (item.quantity <= item.alertThreshold) urgency = "critical";
  else if (shouldReorder) urgency = "reorder";
  else if (daysOfCover !== null && daysOfCover <= config.leadTimeDays + config.safetyDays) urgency = "watch";

  return {
    item,
    avgDailyUsage,
    consumedInWindow,
    daysOfCover,
    reorderPoint,
    suggestedOrderQty: shouldReorder ? Math.max(suggestedOrderQty, 1) : suggestedOrderQty,
    shouldReorder,
    urgency,
  };
}

export function buildReorderInsights(
  items: InventoryItem[],
  movements: StockMovement[],
  config: ReorderConfig = DEFAULT_REORDER_CONFIG,
): ReorderInsight[] {
  const order: Record<ReorderInsight["urgency"], number> = { critical: 0, reorder: 1, watch: 2, ok: 3 };
  return items
    .map((item) => computeReorderInsight(item, movements, config))
    .sort((a, b) => {
      if (order[a.urgency] !== order[b.urgency]) return order[a.urgency] - order[b.urgency];
      return (a.daysOfCover ?? Infinity) - (b.daysOfCover ?? Infinity);
    });
}

// ── 4.2 — Prévision de demande saisonnière liée aux événements ──

export type SeasonalForecast = {
  event: EventRow;
  daysUntil: number;
  /** Besoin prévisionnel par catégorie de stock (unités). */
  needByCategory: Record<string, number>;
  totalUnits: number;
};

/**
 * Estime la consommation moyenne historique de stock par événement passé,
 * puis projette ce besoin sur les événements à venir dans la fenêtre.
 * Approche : consommation moyenne / événement passé, pondérée par catégorie.
 */
export function forecastSeasonalDemand(
  events: EventRow[],
  movements: StockMovement[],
  items: InventoryItem[],
  horizonDays = 120,
): SeasonalForecast[] {
  const now = Date.now();
  const categoryOfItem = new Map(items.map((i) => [i.id, i.category as string]));

  // Consommation historique liée à des événements passés (imputation via reason contenant "event"/"salon"
  // ou tout mouvement sortant). On agrège par catégorie et on divise par le nombre d'événements passés.
  const pastEvents = events.filter((e) => new Date(e.endDate).getTime() < now);
  const pastEventCount = Math.max(1, pastEvents.length);

  const consumedByCategory: Record<string, number> = {};
  for (const m of movements) {
    if (m.changeAmount >= 0) continue;
    const category = m.itemCategory ?? categoryOfItem.get(m.itemId) ?? "Autre";
    consumedByCategory[category] = (consumedByCategory[category] ?? 0) + Math.abs(m.changeAmount);
  }

  const avgPerEventByCategory: Record<string, number> = {};
  for (const [cat, total] of Object.entries(consumedByCategory)) {
    avgPerEventByCategory[cat] = total / pastEventCount;
  }

  const horizonTs = now + horizonDays * DAY_MS;
  const upcoming = events
    .filter((e) => {
      const start = new Date(e.startDate).getTime();
      return Number.isFinite(start) && start >= now && start <= horizonTs;
    })
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  return upcoming.map((event) => {
    const daysUntil = Math.max(0, Math.round((new Date(event.startDate).getTime() - now) / DAY_MS));
    const needByCategory: Record<string, number> = {};
    let totalUnits = 0;
    for (const [cat, avg] of Object.entries(avgPerEventByCategory)) {
      const need = Math.round(avg);
      if (need > 0) {
        needByCategory[cat] = need;
        totalUnits += need;
      }
    }
    return { event, daysUntil, needByCategory, totalUnits };
  });
}
