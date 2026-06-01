/** Kits prédéfinis : résolution par nom d'article (contient, insensible à la casse). */
export type EventStockKitItem = {
  nameIncludes: string;
  quantity: number;
};

export type EventStockKit = {
  key: string;
  label: string;
  description: string;
  items: EventStockKitItem[];
};

export const eventStockKits: EventStockKit[] = [
  {
    key: "stand-standard",
    label: "Kit salon standard",
    description: "Roll-ups, kakémonos et goodies courants.",
    items: [
      { nameIncludes: "roll", quantity: 2 },
      { nameIncludes: "kaké", quantity: 2 },
      { nameIncludes: "kake", quantity: 2 },
      { nameIncludes: "goodies", quantity: 1 },
      { nameIncludes: "flyer", quantity: 1 },
    ],
  },
  {
    key: "stand-compact",
    label: "Kit compact",
    description: "Minimum pour un petit stand.",
    items: [
      { nameIncludes: "roll", quantity: 1 },
      { nameIncludes: "kaké", quantity: 1 },
      { nameIncludes: "kake", quantity: 1 },
    ],
  },
];

export function resolveKitToInventoryIds(
  kit: EventStockKit,
  inventory: Array<{ id: string; name: string }>,
): Array<{ inventoryItemId: string; quantity: number; label: string }> {
  const resolved: Array<{ inventoryItemId: string; quantity: number; label: string }> = [];
  const used = new Set<string>();

  for (const need of kit.items) {
    const needle = need.nameIncludes.toLowerCase();
    const match = inventory.find(
      (i) => !used.has(i.id) && i.name.toLowerCase().includes(needle),
    );
    if (match) {
      used.add(match.id);
      resolved.push({
        inventoryItemId: match.id,
        quantity: need.quantity,
        label: match.name,
      });
    }
  }
  return resolved;
}
