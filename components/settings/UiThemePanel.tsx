"use client";

import { Check, Palette } from "lucide-react";
import { useUiTheme } from "../../lib/uiThemeContext";
import {
  tokensToCssVars,
  UI_THEMES,
  type UiThemeId,
  type UiThemeMeta,
} from "../../lib/uiThemes";

function ThemePreview({ theme }: { theme: UiThemeMeta }) {
  const vars = tokensToCssVars(theme.tokens);
  const fontStack =
    theme.id === "atelier"
      ? "var(--font-atelier-display), var(--font-atelier-sans), system-ui, sans-serif"
      : theme.id === "encre"
        ? '"Source Serif 4", "IBM Plex Sans", Georgia, serif'
        : theme.id === "phare"
          ? "Sora, \"DM Sans\", system-ui, sans-serif"
          : theme.id === "prairie"
            ? "Fraunces, Nunito, Georgia, serif"
            : '"Space Grotesk", "DM Sans", system-ui, sans-serif';
  const bodyFont =
    theme.id === "atelier"
      ? "var(--font-atelier-sans), system-ui, sans-serif"
      : theme.id === "encre"
        ? '"IBM Plex Sans", system-ui, sans-serif'
        : theme.id === "prairie"
          ? "Nunito, system-ui, sans-serif"
          : '"DM Sans", system-ui, sans-serif';

  return (
    <div
      className="overflow-hidden border"
      style={{
        ...vars,
        borderColor: "var(--line)",
        borderRadius: "var(--radius-lg)",
        background: "var(--body-gradient), var(--background)",
        color: "var(--foreground)",
        fontFamily: bodyFont,
        boxShadow: "var(--shadow-1)",
      }}
    >
      <div
        className="flex items-center justify-between border-b px-3 py-2"
        style={{
          borderColor: "var(--line)",
          background: "var(--surface)",
        }}
      >
        <span
          className="text-[13px] font-semibold"
          style={{ fontFamily: fontStack, letterSpacing: "-0.02em" }}
        >
          Tuesday
        </span>
        <span
          className="px-2 py-0.5 text-[10px] font-semibold"
          style={{
            background: "var(--accent-soft)",
            color: "var(--accent-strong)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {theme.tagline}
        </span>
      </div>

      <div className="space-y-2.5 p-3">
        <div
          className="border p-2.5"
          style={{
            background: "var(--surface)",
            borderColor: "var(--line)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-1)",
          }}
        >
          <p
            className="text-[12px] font-semibold"
            style={{ fontFamily: fontStack, letterSpacing: "-0.02em" }}
          >
            Titre de carte
          </p>
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--ink-muted)" }}>
            Surfaces, texte et accents changent ensemble.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span
            className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold"
            style={{
              background: "var(--accent)",
              color: "var(--accent-contrast)",
              borderRadius: "var(--radius-md)",
            }}
          >
            Primaire
          </span>
          <span
            className="inline-flex items-center border px-2.5 py-1 text-[11px] font-semibold"
            style={{
              background: "var(--surface)",
              color: "var(--foreground)",
              borderColor: "var(--line-strong)",
              borderRadius: "var(--radius-md)",
            }}
          >
            Secondaire
          </span>
          <span
            className="inline-flex items-center px-2.5 py-1 text-[11px] font-semibold"
            style={{
              background: "var(--surface-soft)",
              color: "var(--ink-muted)",
              borderRadius: "var(--radius-md)",
            }}
          >
            Chip
          </span>
        </div>

        <div
          className="h-1.5 w-full overflow-hidden"
          style={{
            background: "var(--surface-soft)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <div
            className="h-full w-2/3"
            style={{
              background: "var(--accent)",
              borderRadius: "var(--radius-sm)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function UiThemePanel() {
  const { themeId, setThemeId } = useUiTheme();

  return (
    <section className="ui-surface space-y-4 rounded-2xl p-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
          Apparence
        </p>
        <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
          <Palette className="h-5 w-5 text-[var(--accent)]" aria-hidden />
          Thèmes d’interface
        </h2>
        <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
          Cinq looks complets — typo, couleurs, coins et boutons. Cliquez pour appliquer ;
          le choix est mémorisé sur cet appareil.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {UI_THEMES.map((theme) => {
          const selected = theme.id === themeId;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => setThemeId(theme.id as UiThemeId)}
              aria-pressed={selected}
              className={[
                "group space-y-2 rounded-2xl border p-3 text-left transition",
                selected
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[var(--shadow-1)]"
                  : "border-[var(--line)] bg-[var(--surface)] hover:-translate-y-0.5 hover:border-[var(--line-strong)]",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">{theme.name}</p>
                  <p className="text-[11px] text-[color:var(--foreground)]/55">{theme.vibe}</p>
                  <p className="mt-0.5 text-[10px] font-medium text-[color:var(--foreground)]/40">
                    {theme.fonts}
                  </p>
                </div>
                {selected ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-contrast)]">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--foreground)]/35">
                    Aperçu
                  </span>
                )}
              </div>
              <ThemePreview theme={theme} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
