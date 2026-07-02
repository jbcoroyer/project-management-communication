import type { SocialPost } from "../socialTypes";

const WEEKDAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

/** Score d'engagement combiné d'un post (taux d'engagement priorisé, sinon réactions). */
export function engagementScore(post: SocialPost): number {
  if (typeof post.engagementRate === "number" && post.engagementRate > 0) return post.engagementRate;
  const reactions = post.reactionsCount ?? 0;
  const impressions = post.impressionsCount ?? 0;
  if (impressions > 0) return (reactions / impressions) * 100;
  return reactions;
}

function publishedWithMetrics(posts: SocialPost[]): SocialPost[] {
  return posts.filter((p) => (p.status === "Publié" || p.publicationStatus) && engagementScore(p) > 0);
}

export type SlotStat = { key: string; label: string; avgScore: number; count: number };

/** Meilleurs jours de publication d'après l'engagement réel. */
export function bestDays(posts: SocialPost[]): SlotStat[] {
  const map = new Map<number, { total: number; count: number }>();
  for (const p of publishedWithMetrics(posts)) {
    const d = new Date(p.scheduledAt);
    if (Number.isNaN(d.getTime())) continue;
    const day = d.getDay();
    const cur = map.get(day) ?? { total: 0, count: 0 };
    cur.total += engagementScore(p);
    cur.count += 1;
    map.set(day, cur);
  }
  return Array.from(map.entries())
    .map(([day, v]) => ({ key: String(day), label: WEEKDAYS[day], avgScore: v.total / v.count, count: v.count }))
    .sort((a, b) => b.avgScore - a.avgScore);
}

/** Meilleures tranches horaires d'après l'engagement réel. */
export function bestHours(posts: SocialPost[]): SlotStat[] {
  const map = new Map<number, { total: number; count: number }>();
  for (const p of publishedWithMetrics(posts)) {
    const d = new Date(p.scheduledAt);
    if (Number.isNaN(d.getTime())) continue;
    const hour = d.getHours();
    const cur = map.get(hour) ?? { total: 0, count: 0 };
    cur.total += engagementScore(p);
    cur.count += 1;
    map.set(hour, cur);
  }
  return Array.from(map.entries())
    .map(([hour, v]) => ({ key: String(hour), label: `${String(hour).padStart(2, "0")}h`, avgScore: v.total / v.count, count: v.count }))
    .sort((a, b) => b.avgScore - a.avgScore);
}

/** Posts les plus performants (bibliothèque de contenus à recycler). */
export function topPerformingPosts(posts: SocialPost[], limit = 10): SocialPost[] {
  return [...publishedWithMetrics(posts)]
    .sort((a, b) => engagementScore(b) - engagementScore(a))
    .slice(0, limit);
}

/** Recommandation textuelle synthétique. */
export function bestTimeRecommendation(posts: SocialPost[]): string | null {
  const days = bestDays(posts);
  const hours = bestHours(posts);
  if (days.length === 0 || hours.length === 0) return null;
  return `Publiez de préférence le ${days[0].label.toLowerCase()} vers ${hours[0].label} (meilleur engagement observé).`;
}
