import type { AdminId, ColumnId } from "./types";
import { getAdminColorIndex } from "./adminColorAssignments";

export const columnStyles: Record<
  ColumnId,
  {
    headerBg: string;
    headerText: string;
    cellBg: string;
    cellBorder: string;
  }
> = {
  "À faire": {
    headerBg: "bg-[#f3eee7]",
    headerText: "text-[#4f4338]",
    cellBg: "bg-[#f7f3ed]",
    cellBorder: "border-[#e4dccf]",
  },
  "En cours": {
    headerBg: "bg-[#efe8de]",
    headerText: "text-[#5a4e42]",
    cellBg: "bg-[#f8f4ee]",
    cellBorder: "border-[#dfd4c5]",
  },
  "En validation": {
    headerBg: "bg-[#ece5d9]",
    headerText: "text-[#5d5145]",
    cellBg: "bg-[#f8f3eb]",
    cellBorder: "border-[#dfd2c1]",
  },
  Terminé: {
    headerBg: "bg-[#e7decf]",
    headerText: "text-[#4d4338]",
    cellBg: "bg-[#f4ede3]",
    cellBorder: "border-[#d6c7b0]",
  },
};

/** Badges collaborateurs : 24 teintes distinctes ; index attribués par sync (sans doublon si ≤ 24 users). */
const BADGE_VARIANTS = [
  "border-2 border-orange-400 bg-orange-100 text-orange-950",
  "border-2 border-teal-500 bg-teal-100 text-teal-950",
  "border-2 border-indigo-500 bg-indigo-100 text-indigo-950",
  "border-2 border-rose-500 bg-rose-100 text-rose-950",
  "border-2 border-violet-500 bg-violet-100 text-violet-950",
  "border-2 border-emerald-500 bg-emerald-100 text-emerald-950",
  "border-2 border-sky-500 bg-sky-100 text-sky-950",
  "border-2 border-cyan-500 bg-cyan-100 text-cyan-950",
  "border-2 border-red-500 bg-red-100 text-red-950",
  "border-2 border-amber-500 bg-amber-100 text-amber-950",
  "border-2 border-lime-500 bg-lime-100 text-lime-950",
  "border-2 border-fuchsia-500 bg-fuchsia-100 text-fuchsia-950",
  "border-2 border-blue-500 bg-blue-100 text-blue-950",
  "border-2 border-pink-500 bg-pink-100 text-pink-950",
  "border-2 border-green-600 bg-green-100 text-green-950",
  "border-2 border-purple-600 bg-purple-100 text-purple-950",
  "border-2 border-yellow-500 bg-yellow-100 text-yellow-950",
  "border-2 border-slate-500 bg-slate-100 text-slate-950",
  "border-2 border-zinc-500 bg-zinc-100 text-zinc-950",
  "border-2 border-stone-500 bg-stone-100 text-stone-950",
  "border-2 border-gray-500 bg-gray-100 text-gray-950",
  "border-2 border-neutral-500 bg-neutral-100 text-neutral-950",
  "border-2 border-blue-800 bg-blue-200 text-blue-950",
  "border-2 border-rose-700 bg-rose-200 text-rose-950",
] as const;

const CARD_BG_VARIANTS = [
  "bg-orange-50/95 border-orange-300",
  "bg-teal-50/95 border-teal-300",
  "bg-indigo-50/95 border-indigo-300",
  "bg-rose-50/95 border-rose-300",
  "bg-violet-50/95 border-violet-300",
  "bg-emerald-50/95 border-emerald-300",
  "bg-sky-50/95 border-sky-300",
  "bg-cyan-50/95 border-cyan-300",
  "bg-red-50/95 border-red-300",
  "bg-amber-50/95 border-amber-300",
  "bg-lime-50/95 border-lime-300",
  "bg-fuchsia-50/95 border-fuchsia-300",
  "bg-blue-50/95 border-blue-300",
  "bg-pink-50/95 border-pink-300",
  "bg-green-50/95 border-green-300",
  "bg-purple-50/95 border-purple-300",
  "bg-yellow-50/95 border-yellow-300",
  "bg-slate-50/95 border-slate-300",
  "bg-zinc-50/95 border-zinc-300",
  "bg-stone-50/95 border-stone-300",
  "bg-gray-50/95 border-gray-300",
  "bg-neutral-50/95 border-neutral-300",
  "bg-blue-100/95 border-blue-400",
  "bg-rose-100/95 border-rose-400",
] as const;

/** Bande gauche Kanban, calendrier, légendes : couleurs franches et distinctes. */
const SOLID_COLORS = [
  "#c2410c",
  "#0f766e",
  "#4338ca",
  "#be123c",
  "#6d28d9",
  "#047857",
  "#0369a1",
  "#0e7490",
  "#b91c1c",
  "#d97706",
  "#65a30d",
  "#c026d3",
  "#2563eb",
  "#db2777",
  "#16a34a",
  "#9333ea",
  "#ca8a04",
  "#475569",
  "#71717a",
  "#57534e",
  "#4b5563",
  "#525252",
  "#1e40af",
  "#9f1239",
] as const;

const FILTER_PILL_VARIANTS = [
  "border-2 border-orange-400 bg-orange-100 text-orange-950 ring-2 ring-orange-500/40",
  "border-2 border-teal-500 bg-teal-100 text-teal-950 ring-2 ring-teal-600/40",
  "border-2 border-indigo-500 bg-indigo-100 text-indigo-950 ring-2 ring-indigo-600/40",
  "border-2 border-rose-500 bg-rose-100 text-rose-950 ring-2 ring-rose-600/40",
  "border-2 border-violet-500 bg-violet-100 text-violet-950 ring-2 ring-violet-600/40",
  "border-2 border-emerald-500 bg-emerald-100 text-emerald-950 ring-2 ring-emerald-600/40",
  "border-2 border-sky-500 bg-sky-100 text-sky-950 ring-2 ring-sky-600/40",
  "border-2 border-cyan-500 bg-cyan-100 text-cyan-950 ring-2 ring-cyan-600/40",
  "border-2 border-red-500 bg-red-100 text-red-950 ring-2 ring-red-600/40",
  "border-2 border-amber-500 bg-amber-100 text-amber-950 ring-2 ring-amber-600/40",
  "border-2 border-lime-500 bg-lime-100 text-lime-950 ring-2 ring-lime-600/40",
  "border-2 border-fuchsia-500 bg-fuchsia-100 text-fuchsia-950 ring-2 ring-fuchsia-600/40",
  "border-2 border-blue-500 bg-blue-100 text-blue-950 ring-2 ring-blue-600/40",
  "border-2 border-pink-500 bg-pink-100 text-pink-950 ring-2 ring-pink-600/40",
  "border-2 border-green-600 bg-green-100 text-green-950 ring-2 ring-green-600/40",
  "border-2 border-purple-600 bg-purple-100 text-purple-950 ring-2 ring-purple-600/40",
  "border-2 border-yellow-500 bg-yellow-100 text-yellow-950 ring-2 ring-yellow-600/40",
  "border-2 border-slate-500 bg-slate-100 text-slate-950 ring-2 ring-slate-600/40",
  "border-2 border-zinc-500 bg-zinc-100 text-zinc-950 ring-2 ring-zinc-600/40",
  "border-2 border-stone-500 bg-stone-100 text-stone-950 ring-2 ring-stone-600/40",
  "border-2 border-gray-500 bg-gray-100 text-gray-950 ring-2 ring-gray-600/40",
  "border-2 border-neutral-500 bg-neutral-100 text-neutral-950 ring-2 ring-neutral-600/40",
  "border-2 border-blue-800 bg-blue-200 text-blue-950 ring-2 ring-blue-800/40",
  "border-2 border-rose-700 bg-rose-200 text-rose-950 ring-2 ring-rose-700/40",
] as const;

export type AdminAvatarMetaResolved = {
  gender: "female" | "male";
  avatarBg: string;
  avatarText: string;
  calendarColor: string;
};

const AVATAR_META_VARIANTS: readonly AdminAvatarMetaResolved[] = [
  {
    gender: "female",
    avatarBg: "bg-orange-200",
    avatarText: "text-orange-950",
    calendarColor: "#c2410c",
  },
  {
    gender: "female",
    avatarBg: "bg-teal-200",
    avatarText: "text-teal-950",
    calendarColor: "#0f766e",
  },
  {
    gender: "male",
    avatarBg: "bg-indigo-200",
    avatarText: "text-indigo-950",
    calendarColor: "#4338ca",
  },
  {
    gender: "male",
    avatarBg: "bg-rose-200",
    avatarText: "text-rose-950",
    calendarColor: "#be123c",
  },
  {
    gender: "female",
    avatarBg: "bg-violet-200",
    avatarText: "text-violet-950",
    calendarColor: "#6d28d9",
  },
  {
    gender: "male",
    avatarBg: "bg-emerald-200",
    avatarText: "text-emerald-950",
    calendarColor: "#047857",
  },
  {
    gender: "female",
    avatarBg: "bg-sky-200",
    avatarText: "text-sky-950",
    calendarColor: "#0369a1",
  },
  {
    gender: "male",
    avatarBg: "bg-cyan-200",
    avatarText: "text-cyan-950",
    calendarColor: "#0e7490",
  },
  {
    gender: "female",
    avatarBg: "bg-red-200",
    avatarText: "text-red-950",
    calendarColor: "#b91c1c",
  },
  {
    gender: "male",
    avatarBg: "bg-amber-200",
    avatarText: "text-amber-950",
    calendarColor: "#d97706",
  },
  {
    gender: "female",
    avatarBg: "bg-lime-200",
    avatarText: "text-lime-950",
    calendarColor: "#65a30d",
  },
  {
    gender: "male",
    avatarBg: "bg-fuchsia-200",
    avatarText: "text-fuchsia-950",
    calendarColor: "#c026d3",
  },
  {
    gender: "female",
    avatarBg: "bg-blue-200",
    avatarText: "text-blue-950",
    calendarColor: "#2563eb",
  },
  {
    gender: "male",
    avatarBg: "bg-pink-200",
    avatarText: "text-pink-950",
    calendarColor: "#db2777",
  },
  {
    gender: "female",
    avatarBg: "bg-green-200",
    avatarText: "text-green-950",
    calendarColor: "#16a34a",
  },
  {
    gender: "male",
    avatarBg: "bg-purple-200",
    avatarText: "text-purple-950",
    calendarColor: "#9333ea",
  },
  {
    gender: "female",
    avatarBg: "bg-yellow-200",
    avatarText: "text-yellow-950",
    calendarColor: "#ca8a04",
  },
  {
    gender: "male",
    avatarBg: "bg-slate-200",
    avatarText: "text-slate-950",
    calendarColor: "#475569",
  },
  {
    gender: "female",
    avatarBg: "bg-zinc-200",
    avatarText: "text-zinc-950",
    calendarColor: "#71717a",
  },
  {
    gender: "male",
    avatarBg: "bg-stone-200",
    avatarText: "text-stone-950",
    calendarColor: "#57534e",
  },
  {
    gender: "female",
    avatarBg: "bg-gray-200",
    avatarText: "text-gray-950",
    calendarColor: "#4b5563",
  },
  {
    gender: "male",
    avatarBg: "bg-neutral-200",
    avatarText: "text-neutral-950",
    calendarColor: "#525252",
  },
  {
    gender: "female",
    avatarBg: "bg-blue-300",
    avatarText: "text-blue-950",
    calendarColor: "#1e40af",
  },
  {
    gender: "male",
    avatarBg: "bg-rose-300",
    avatarText: "text-rose-950",
    calendarColor: "#9f1239",
  },
];

export type AdminLaneStyle = {
  laneBorder: string;
  laneBg: string;
  accentDot: string;
  chip: string;
  headerText: string;
};

const LANE_VARIANTS: readonly AdminLaneStyle[] = [
  {
    laneBorder: "border-orange-300",
    laneBg: "bg-orange-50/50",
    accentDot: "bg-orange-600",
    chip: "border-orange-400 bg-orange-100 text-orange-950",
    headerText: "text-orange-900",
  },
  {
    laneBorder: "border-teal-300",
    laneBg: "bg-teal-50/50",
    accentDot: "bg-teal-600",
    chip: "border-teal-400 bg-teal-100 text-teal-950",
    headerText: "text-teal-900",
  },
  {
    laneBorder: "border-indigo-300",
    laneBg: "bg-indigo-50/50",
    accentDot: "bg-indigo-600",
    chip: "border-indigo-400 bg-indigo-100 text-indigo-950",
    headerText: "text-indigo-900",
  },
  {
    laneBorder: "border-rose-300",
    laneBg: "bg-rose-50/50",
    accentDot: "bg-rose-600",
    chip: "border-rose-400 bg-rose-100 text-rose-950",
    headerText: "text-rose-900",
  },
  {
    laneBorder: "border-violet-300",
    laneBg: "bg-violet-50/50",
    accentDot: "bg-violet-600",
    chip: "border-violet-400 bg-violet-100 text-violet-950",
    headerText: "text-violet-900",
  },
  {
    laneBorder: "border-emerald-300",
    laneBg: "bg-emerald-50/50",
    accentDot: "bg-emerald-600",
    chip: "border-emerald-400 bg-emerald-100 text-emerald-950",
    headerText: "text-emerald-900",
  },
  {
    laneBorder: "border-sky-300",
    laneBg: "bg-sky-50/50",
    accentDot: "bg-sky-600",
    chip: "border-sky-400 bg-sky-100 text-sky-950",
    headerText: "text-sky-900",
  },
  {
    laneBorder: "border-cyan-300",
    laneBg: "bg-cyan-50/50",
    accentDot: "bg-cyan-600",
    chip: "border-cyan-400 bg-cyan-100 text-cyan-950",
    headerText: "text-cyan-900",
  },
  {
    laneBorder: "border-red-300",
    laneBg: "bg-red-50/50",
    accentDot: "bg-red-600",
    chip: "border-red-400 bg-red-100 text-red-950",
    headerText: "text-red-900",
  },
  {
    laneBorder: "border-amber-300",
    laneBg: "bg-amber-50/50",
    accentDot: "bg-amber-600",
    chip: "border-amber-400 bg-amber-100 text-amber-950",
    headerText: "text-amber-900",
  },
  {
    laneBorder: "border-lime-300",
    laneBg: "bg-lime-50/50",
    accentDot: "bg-lime-600",
    chip: "border-lime-400 bg-lime-100 text-lime-950",
    headerText: "text-lime-900",
  },
  {
    laneBorder: "border-fuchsia-300",
    laneBg: "bg-fuchsia-50/50",
    accentDot: "bg-fuchsia-600",
    chip: "border-fuchsia-400 bg-fuchsia-100 text-fuchsia-950",
    headerText: "text-fuchsia-900",
  },
  {
    laneBorder: "border-blue-300",
    laneBg: "bg-blue-50/50",
    accentDot: "bg-blue-600",
    chip: "border-blue-400 bg-blue-100 text-blue-950",
    headerText: "text-blue-900",
  },
  {
    laneBorder: "border-pink-300",
    laneBg: "bg-pink-50/50",
    accentDot: "bg-pink-600",
    chip: "border-pink-400 bg-pink-100 text-pink-950",
    headerText: "text-pink-900",
  },
  {
    laneBorder: "border-green-300",
    laneBg: "bg-green-50/50",
    accentDot: "bg-green-600",
    chip: "border-green-400 bg-green-100 text-green-950",
    headerText: "text-green-900",
  },
  {
    laneBorder: "border-purple-300",
    laneBg: "bg-purple-50/50",
    accentDot: "bg-purple-600",
    chip: "border-purple-400 bg-purple-100 text-purple-950",
    headerText: "text-purple-900",
  },
  {
    laneBorder: "border-yellow-300",
    laneBg: "bg-yellow-50/50",
    accentDot: "bg-yellow-600",
    chip: "border-yellow-400 bg-yellow-100 text-yellow-950",
    headerText: "text-yellow-900",
  },
  {
    laneBorder: "border-slate-300",
    laneBg: "bg-slate-50/50",
    accentDot: "bg-slate-600",
    chip: "border-slate-400 bg-slate-100 text-slate-950",
    headerText: "text-slate-900",
  },
  {
    laneBorder: "border-zinc-300",
    laneBg: "bg-zinc-50/50",
    accentDot: "bg-zinc-600",
    chip: "border-zinc-400 bg-zinc-100 text-zinc-950",
    headerText: "text-zinc-900",
  },
  {
    laneBorder: "border-stone-300",
    laneBg: "bg-stone-50/50",
    accentDot: "bg-stone-600",
    chip: "border-stone-400 bg-stone-100 text-stone-950",
    headerText: "text-stone-900",
  },
  {
    laneBorder: "border-gray-300",
    laneBg: "bg-gray-50/50",
    accentDot: "bg-gray-600",
    chip: "border-gray-400 bg-gray-100 text-gray-950",
    headerText: "text-gray-900",
  },
  {
    laneBorder: "border-neutral-300",
    laneBg: "bg-neutral-50/50",
    accentDot: "bg-neutral-600",
    chip: "border-neutral-400 bg-neutral-100 text-neutral-950",
    headerText: "text-neutral-900",
  },
  {
    laneBorder: "border-blue-400",
    laneBg: "bg-blue-100/50",
    accentDot: "bg-blue-800",
    chip: "border-blue-700 bg-blue-200 text-blue-950",
    headerText: "text-blue-950",
  },
  {
    laneBorder: "border-rose-400",
    laneBg: "bg-rose-100/50",
    accentDot: "bg-rose-800",
    chip: "border-rose-600 bg-rose-200 text-rose-950",
    headerText: "text-rose-950",
  },
];

export function getAdminColorPaletteSize(): number {
  return BADGE_VARIANTS.length;
}

function adminColorIdx(name: string): number {
  return getAdminColorIndex(name, BADGE_VARIANTS.length);
}

export function adminBadgeClassFor(name: string): string {
  if (!name.trim()) return "border-slate-200 bg-slate-50 text-slate-700";
  return BADGE_VARIANTS[adminColorIdx(name)] ?? BADGE_VARIANTS[0];
}

export function adminCardBgClassFor(name: string): string {
  if (!name.trim()) return "bg-[var(--surface-soft)] border-[var(--line)]";
  return CARD_BG_VARIANTS[adminColorIdx(name)] ?? CARD_BG_VARIANTS[0];
}

export function adminSolidColorFor(name: string): string {
  if (!name.trim()) return "#94a3b8";
  return SOLID_COLORS[adminColorIdx(name)] ?? SOLID_COLORS[0];
}

export function adminFilterPillClassFor(name: string): string {
  if (!name.trim()) return "bg-[var(--surface-soft)] text-[color:var(--foreground)]/60 border-[var(--line)]";
  return FILTER_PILL_VARIANTS[adminColorIdx(name)] ?? FILTER_PILL_VARIANTS[0];
}

export function adminAvatarMetaFor(name: string): AdminAvatarMetaResolved {
  if (!name.trim()) {
    return {
      gender: "male",
      avatarBg: "bg-[var(--surface-soft)]",
      avatarText: "text-[color:var(--foreground)]/55",
      calendarColor: "#64748b",
    };
  }
  return AVATAR_META_VARIANTS[adminColorIdx(name)] ?? AVATAR_META_VARIANTS[0];
}

export function adminLaneStyleFor(name: string): AdminLaneStyle {
  if (!name.trim()) {
    return {
      laneBorder: "border-[var(--line)]",
      laneBg: "bg-[var(--surface-soft)]/40",
      accentDot: "bg-[var(--foreground)]/30",
      chip: "border-[var(--line)] bg-[var(--surface)] text-[color:var(--foreground)]/65",
      headerText: "text-[color:var(--foreground)]/70",
    };
  }
  return LANE_VARIANTS[adminColorIdx(name)] ?? LANE_VARIANTS[0]!;
}

/** @deprecated Utiliser les fonctions `admin*For` — conservé pour typage legacy. */
export const adminBadgeClasses: Record<AdminId, string> = {};

/** @deprecated Utiliser `adminCardBgClassFor`. */
export const adminCardBgClasses: Record<AdminId, string> = {};

/** @deprecated Utiliser `adminSolidColorFor`. */
export const adminSolidColors: Record<AdminId, string> = {};

/** @deprecated Utiliser `adminFilterPillClassFor`. */
export const adminFilterPillClasses: Record<AdminId, string> = {};

/** @deprecated Utiliser `adminAvatarMetaFor`. */
export const adminAvatarMeta: Record<AdminId, AdminAvatarMetaResolved> = {};

/** @deprecated Utiliser `adminLaneStyleFor`. */
export const adminLaneStyles: Record<
  AdminId,
  {
    laneBorder: string;
    laneBg: string;
    accentDot: string;
    chip: string;
    headerText: string;
  }
> = {};

export const domainCalendarColors: Record<string, string> = {
  "🖥️ Digitale": "#3b82f6",
  "📮 Client": "#8b5cf6",
  "🎟️ Event": "#f59e0b",
  "🌎 General": "#10b981",
  "🖨️ Print": "#ec4899",
  "📰 Presse": "#06b6d4",
};

export const defaultDomainColor = "#64748b";

export const domainTagStyles: Record<string, string> = {
  "🖥️ Digitale": "border-blue-200 bg-blue-50 text-blue-700",
  "📮 Client": "border-violet-200 bg-violet-50 text-violet-700",
  "🎟️ Event": "border-amber-200 bg-amber-50 text-amber-700",
  "🌎 General": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "🖨️ Print": "border-pink-200 bg-pink-50 text-pink-700",
  "📰 Presse": "border-cyan-200 bg-cyan-50 text-cyan-700",
  default: "border-slate-200 bg-slate-50 text-slate-700",
};
