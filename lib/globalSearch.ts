export type GlobalSearchKind = "task" | "event" | "stock" | "deliverable" | "dam";

export type GlobalSearchHit = {
  id: string;
  kind: GlobalSearchKind;
  title: string;
  subtitle: string;
  href: string;
};

export const GLOBAL_SEARCH_KIND_LABEL: Record<GlobalSearchKind, string> = {
  task: "Tâche",
  event: "Événement",
  stock: "Stock",
  deliverable: "Livrable",
  dam: "Médias",
};

function matchesQuery(haystack: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const terms = q.split(/\s+/).filter(Boolean);
  const h = haystack.toLowerCase();
  return terms.every((t) => h.includes(t));
}

export function scoreHit(title: string, subtitle: string, query: string): number {
  const q = query.trim().toLowerCase();
  const t = title.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  if (subtitle.toLowerCase().includes(q)) return 40;
  return matchesQuery(`${title} ${subtitle}`, query) ? 20 : 0;
}

export function filterAndRankHits(hits: GlobalSearchHit[], query: string, limit = 20): GlobalSearchHit[] {
  return hits
    .map((hit) => ({ hit, score: scoreHit(hit.title, hit.subtitle, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.hit.title.localeCompare(b.hit.title, "fr"))
    .slice(0, limit)
    .map((x) => x.hit);
}
