import type { AdminId, ColumnId } from "./types";

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

/** Index stable 0..n-1 à partir du nom (collaborateur créé en base). */
function adminPaletteIndex(name: string, modulo: number): number {
  const s = name.trim();
  if (!s) return 0;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i);
  }
  return Math.abs(h) % modulo;
}

const BADGE_VARIANTS = [
  "border border-[#e0d2c2] bg-[#f4ece3] text-[#6b4f3a]",
  "border border-[#d9d0c3] bg-[#f1ece5] text-[#4f5a69]",
  "border border-[#d5cdc1] bg-[#eee8df] text-[#574f61]",
  "border border-[#dacfb9] bg-[#f2ecdf] text-[#64553e]",
] as const;

const CARD_BG_VARIANTS = [
  "bg-[#fdf8f4] border-[#e8d8c8]",
  "bg-[#f8f6f3] border-[#ddd5cc]",
  "bg-[#f7f5f2] border-[#d8d0ca]",
  "bg-[#fdf9f3] border-[#e2d4be]",
] as const;

const SOLID_COLORS = ["#87684e", "#5a6f83", "#6a5f77", "#8b7353"] as const;

const FILTER_PILL_VARIANTS = [
  "bg-[#f4ece3] text-[#6b4f3a] border-[#d6c0ae] ring-[#87684e]",
  "bg-[#e8ecf0] text-[#3a5068] border-[#bcccd9] ring-[#5a6f83]",
  "bg-[#ebe8ef] text-[#4f4860] border-[#c9c4d4] ring-[#6a5f77]",
  "bg-[#f2ece0] text-[#5e4d30] border-[#d4c4a0] ring-[#8b7353]",
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
    avatarBg: "bg-[#f3e7db]",
    avatarText: "text-[#70543f]",
    calendarColor: "#87684e",
  },
  {
    gender: "female",
    avatarBg: "bg-[#ece8df]",
    avatarText: "text-[#4f5f6f]",
    calendarColor: "#5a6f83",
  },
  {
    gender: "male",
    avatarBg: "bg-[#ebe5df]",
    avatarText: "text-[#5d5569]",
    calendarColor: "#6a5f77",
  },
  {
    gender: "male",
    avatarBg: "bg-[#f0e8da]",
    avatarText: "text-[#6f5d45]",
    calendarColor: "#8b7353",
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
    laneBorder: "border-[#e2d4c5]",
    laneBg: "bg-[#f8f2ea]/40",
    accentDot: "bg-[#8b6a4e]",
    chip: "border-[#e2d4c5] bg-[#f2e8dc] text-[#70543f]",
    headerText: "text-[#70543f]",
  },
  {
    laneBorder: "border-[#d9d2c8]",
    laneBg: "bg-[#f5f1ea]/40",
    accentDot: "bg-[#607487]",
    chip: "border-[#d9d2c8] bg-[#eeebe5] text-[#4f5f6f]",
    headerText: "text-[#4f5f6f]",
  },
  {
    laneBorder: "border-[#d6cec3]",
    laneBg: "bg-[#f3eee8]/40",
    accentDot: "bg-[#6b6078]",
    chip: "border-[#d6cec3] bg-[#ece8e2] text-[#5d5569]",
    headerText: "text-[#5d5569]",
  },
  {
    laneBorder: "border-[#dacfb9]",
    laneBg: "bg-[#f6f1e8]/40",
    accentDot: "bg-[#81694d]",
    chip: "border-[#dacfb9] bg-[#efe9de] text-[#6f5d45]",
    headerText: "text-[#6f5d45]",
  },
];

export function adminBadgeClassFor(name: string): string {
  if (!name.trim()) return "border-slate-200 bg-slate-50 text-slate-700";
  return BADGE_VARIANTS[adminPaletteIndex(name, BADGE_VARIANTS.length)];
}

export function adminCardBgClassFor(name: string): string {
  if (!name.trim()) return "bg-[var(--surface-soft)] border-[var(--line)]";
  return CARD_BG_VARIANTS[adminPaletteIndex(name, CARD_BG_VARIANTS.length)];
}

export function adminSolidColorFor(name: string): string {
  if (!name.trim()) return "#94a3b8";
  return SOLID_COLORS[adminPaletteIndex(name, SOLID_COLORS.length)];
}

export function adminFilterPillClassFor(name: string): string {
  if (!name.trim()) return "bg-[var(--surface-soft)] text-[color:var(--foreground)]/60 border-[var(--line)]";
  return FILTER_PILL_VARIANTS[adminPaletteIndex(name, FILTER_PILL_VARIANTS.length)];
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
  return AVATAR_META_VARIANTS[adminPaletteIndex(name, AVATAR_META_VARIANTS.length)];
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
  return LANE_VARIANTS[adminPaletteIndex(name, LANE_VARIANTS.length)] ?? LANE_VARIANTS[0]!;
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
