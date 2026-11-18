/** Thèmes UI Tuesday — looks distincts (typo, couleurs, rayons, ombres). */

export const UI_THEME_STORAGE_KEY = "tuesday-ui-theme";
export const UI_THEME_EVENT = "tuesday-ui-theme-changed";

export type UiThemeId = "atelier" | "encre" | "phare" | "prairie" | "rail";

export type UiThemeTokens = {
  background: string;
  foreground: string;
  surface: string;
  surfaceSoft: string;
  line: string;
  lineStrong: string;
  accent: string;
  accentStrong: string;
  accentSoft: string;
  accentContrast: string;
  ink: string;
  inkMuted: string;
  success: string;
  warning: string;
  danger: string;
  ring: string;
  radiusXs: string;
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  radiusXl: string;
  radius2xl: string;
  radius3xl: string;
  shadow1: string;
  shadow2: string;
  bodyGradient: string;
  controlStyle: "soft" | "ink" | "glass" | "plush" | "flat";
};

export type UiThemeMeta = {
  id: UiThemeId;
  name: string;
  tagline: string;
  vibe: string;
  fonts: string;
  tokens: UiThemeTokens;
};

export const DEFAULT_UI_THEME: UiThemeId = "atelier";

export const UI_THEMES: UiThemeMeta[] = [
  {
    id: "atelier",
    name: "Atelier",
    tagline: "Studio argile",
    vibe: "Chaleureux, éditorial, coins doux.",
    fonts: "Schibsted + Inter",
    tokens: {
      background: "#f4f1ea",
      foreground: "#1a1713",
      surface: "#fcfbf7",
      surfaceSoft: "#ede9df",
      line: "#e3ddd1",
      lineStrong: "#cfc7b6",
      accent: "#bc5a3c",
      accentStrong: "#9e4830",
      accentSoft: "rgba(188, 90, 60, 0.1)",
      accentContrast: "#fcfbf7",
      ink: "#1a1713",
      inkMuted: "rgba(26, 23, 19, 0.62)",
      success: "#3e7d52",
      warning: "#b07320",
      danger: "#b4453f",
      ring: "rgba(26, 23, 19, 0.18)",
      radiusXs: "4px",
      radiusSm: "6px",
      radiusMd: "10px",
      radiusLg: "14px",
      radiusXl: "16px",
      radius2xl: "18px",
      radius3xl: "22px",
      shadow1: "0 1px 2px rgba(20, 17, 13, 0.04), 0 8px 20px rgba(20, 17, 13, 0.05)",
      shadow2: "0 2px 4px rgba(20, 17, 13, 0.05), 0 16px 40px rgba(20, 17, 13, 0.08)",
      bodyGradient:
        "radial-gradient(ellipse 80% 50% at 10% -10%, rgba(188, 90, 60, 0.06), transparent 50%), radial-gradient(ellipse 60% 40% at 90% 0%, rgba(26, 23, 19, 0.03), transparent 45%)",
      controlStyle: "soft",
    },
  },
  {
    id: "encre",
    name: "Encre",
    tagline: "Papier & plume",
    vibe: "Contraste fort, titres sérif, coins nets.",
    fonts: "Source Serif + IBM Plex",
    tokens: {
      background: "#f7f6f2",
      foreground: "#121826",
      surface: "#ffffff",
      surfaceSoft: "#eef0f5",
      line: "#d5dae3",
      lineStrong: "#aeb6c5",
      accent: "#2346d4",
      accentStrong: "#1a34a8",
      accentSoft: "rgba(35, 70, 212, 0.1)",
      accentContrast: "#ffffff",
      ink: "#121826",
      inkMuted: "rgba(18, 24, 38, 0.58)",
      success: "#1f7a4c",
      warning: "#9a6b12",
      danger: "#b42318",
      ring: "rgba(35, 70, 212, 0.28)",
      radiusXs: "2px",
      radiusSm: "3px",
      radiusMd: "5px",
      radiusLg: "7px",
      radiusXl: "8px",
      radius2xl: "10px",
      radius3xl: "12px",
      shadow1: "0 1px 0 rgba(18, 24, 38, 0.06)",
      shadow2: "0 8px 24px rgba(18, 24, 38, 0.08)",
      bodyGradient:
        "linear-gradient(180deg, rgba(18, 24, 38, 0.03), transparent 28%), linear-gradient(90deg, transparent 0%, transparent 49.5%, rgba(18, 24, 38, 0.04) 49.5%, rgba(18, 24, 38, 0.04) 50%, transparent 50%)",
      controlStyle: "ink",
    },
  },
  {
    id: "phare",
    name: "Phare",
    tagline: "Nuit ambrée",
    vibe: "Sombre, calme, surfaces vitrées.",
    fonts: "Sora + DM Sans",
    tokens: {
      background: "#0f141c",
      foreground: "#e8eef8",
      surface: "#171e2a",
      surfaceSoft: "#222b3a",
      line: "#2e394c",
      lineStrong: "#445168",
      accent: "#f0a35a",
      accentStrong: "#ffb76e",
      accentSoft: "rgba(240, 163, 90, 0.16)",
      accentContrast: "#141018",
      ink: "#e8eef8",
      inkMuted: "rgba(232, 238, 248, 0.62)",
      success: "#5dcf8b",
      warning: "#f0b35a",
      danger: "#f07178",
      ring: "rgba(240, 163, 90, 0.35)",
      radiusXs: "6px",
      radiusSm: "10px",
      radiusMd: "14px",
      radiusLg: "18px",
      radiusXl: "22px",
      radius2xl: "26px",
      radius3xl: "32px",
      shadow1: "0 1px 0 rgba(255, 255, 255, 0.04), 0 12px 28px rgba(0, 0, 0, 0.35)",
      shadow2: "0 18px 48px rgba(0, 0, 0, 0.45)",
      bodyGradient:
        "radial-gradient(ellipse 70% 45% at 80% -5%, rgba(240, 163, 90, 0.14), transparent 50%), radial-gradient(ellipse 50% 40% at 0% 20%, rgba(90, 140, 220, 0.1), transparent 45%)",
      controlStyle: "glass",
    },
  },
  {
    id: "prairie",
    name: "Prairie",
    tagline: "Jardin clair",
    vibe: "Doux, organique, boutons bien ronds.",
    fonts: "Fraunces + Nunito",
    tokens: {
      background: "#f3f7ef",
      foreground: "#1f3324",
      surface: "#fbfff8",
      surfaceSoft: "#e5efdc",
      line: "#d5e2c8",
      lineStrong: "#b7cba3",
      accent: "#4f8a5b",
      accentStrong: "#3d7048",
      accentSoft: "rgba(79, 138, 91, 0.14)",
      accentContrast: "#fbfff8",
      ink: "#1f3324",
      inkMuted: "rgba(31, 51, 36, 0.6)",
      success: "#3f8f55",
      warning: "#c08928",
      danger: "#c45b4a",
      ring: "rgba(79, 138, 91, 0.3)",
      radiusXs: "8px",
      radiusSm: "12px",
      radiusMd: "16px",
      radiusLg: "20px",
      radiusXl: "24px",
      radius2xl: "28px",
      radius3xl: "34px",
      shadow1: "0 8px 24px rgba(31, 51, 36, 0.06)",
      shadow2: "0 18px 40px rgba(31, 51, 36, 0.1)",
      bodyGradient:
        "radial-gradient(ellipse 60% 50% at 20% 0%, rgba(79, 138, 91, 0.12), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 10%, rgba(196, 168, 90, 0.1), transparent 50%)",
      controlStyle: "plush",
    },
  },
  {
    id: "rail",
    name: "Rail",
    tagline: "Atelier technique",
    vibe: "Industrial, plat, angles serrés.",
    fonts: "Space Grotesk + DM Sans",
    tokens: {
      background: "#ecece8",
      foreground: "#1c1c1a",
      surface: "#f7f7f4",
      surfaceSoft: "#e2e2dc",
      line: "#cfcfc8",
      lineStrong: "#a8a89f",
      accent: "#e05a18",
      accentStrong: "#c24810",
      accentSoft: "rgba(224, 90, 24, 0.12)",
      accentContrast: "#fffaf6",
      ink: "#1c1c1a",
      inkMuted: "rgba(28, 28, 26, 0.58)",
      success: "#2f7d4a",
      warning: "#b8860b",
      danger: "#c23b2f",
      ring: "rgba(224, 90, 24, 0.3)",
      radiusXs: "0px",
      radiusSm: "2px",
      radiusMd: "3px",
      radiusLg: "4px",
      radiusXl: "4px",
      radius2xl: "6px",
      radius3xl: "8px",
      shadow1: "none",
      shadow2: "0 0 0 1px rgba(28, 28, 26, 0.08)",
      bodyGradient:
        "repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(28, 28, 26, 0.035) 23px, rgba(28, 28, 26, 0.035) 24px)",
      controlStyle: "flat",
    },
  },
];

export function isUiThemeId(value: string | null | undefined): value is UiThemeId {
  return UI_THEMES.some((t) => t.id === value);
}

export function getUiTheme(id: UiThemeId): UiThemeMeta {
  return UI_THEMES.find((t) => t.id === id) ?? UI_THEMES[0]!;
}

export function tokensToCssVars(tokens: UiThemeTokens): Record<string, string> {
  return {
    "--background": tokens.background,
    "--foreground": tokens.foreground,
    "--surface": tokens.surface,
    "--surface-soft": tokens.surfaceSoft,
    "--line": tokens.line,
    "--line-strong": tokens.lineStrong,
    "--accent": tokens.accent,
    "--accent-strong": tokens.accentStrong,
    "--accent-soft": tokens.accentSoft,
    "--accent-contrast": tokens.accentContrast,
    "--ink": tokens.ink,
    "--ink-muted": tokens.inkMuted,
    "--success": tokens.success,
    "--warning": tokens.warning,
    "--danger": tokens.danger,
    "--ring": tokens.ring,
    "--radius-xs": tokens.radiusXs,
    "--radius-sm": tokens.radiusSm,
    "--radius-md": tokens.radiusMd,
    "--radius-lg": tokens.radiusLg,
    "--radius-xl": tokens.radiusXl,
    "--radius-2xl": tokens.radius2xl,
    "--radius-3xl": tokens.radius3xl,
    "--shadow-1": tokens.shadow1,
    "--shadow-2": tokens.shadow2,
    "--body-gradient": tokens.bodyGradient,
  };
}

export function readStoredUiTheme(): UiThemeId {
  if (typeof window === "undefined") return DEFAULT_UI_THEME;
  try {
    const raw = window.localStorage.getItem(UI_THEME_STORAGE_KEY);
    return isUiThemeId(raw) ? raw : DEFAULT_UI_THEME;
  } catch {
    return DEFAULT_UI_THEME;
  }
}

export function applyUiThemeToDocument(id: UiThemeId) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = id;
  document.documentElement.style.colorScheme =
    id === "phare" ? "dark" : "light";
}

export function persistUiTheme(id: UiThemeId) {
  try {
    window.localStorage.setItem(UI_THEME_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  applyUiThemeToDocument(id);
  window.dispatchEvent(new CustomEvent(UI_THEME_EVENT, { detail: id }));
}

/** Script inline anti-FOUC — à injecter dans <head>. */
export const UI_THEME_BOOTSTRAP_SCRIPT = `(function(){try{var k=${JSON.stringify(
  UI_THEME_STORAGE_KEY,
)};var d=${JSON.stringify(DEFAULT_UI_THEME)};var v=localStorage.getItem(k);var ok=${JSON.stringify(
  UI_THEMES.map((t) => t.id),
)};if(ok.indexOf(v)<0)v=d;document.documentElement.setAttribute('data-theme',v);document.documentElement.style.colorScheme=v==='phare'?'dark':'light';}catch(e){document.documentElement.setAttribute('data-theme',${JSON.stringify(
  DEFAULT_UI_THEME,
)});}})();`;
