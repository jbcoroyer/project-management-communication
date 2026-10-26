import { TuesdayMark, type TuesdayTone } from "./TuesdayMark";

export interface TuesdayLoaderProps {
  /** 16–20 dans un bouton ou une pastille, 24 dans une liste, 64–80 en pleine page. */
  size?: number;
  tone?: TuesdayTone;
  /** Texte annoncé aux lecteurs d'écran (et affiché si showLabel). */
  label?: string;
  showLabel?: boolean;
  className?: string;
}

/** Loader 01 « Empilement ». À utiliser partout où il y avait un spinner. */
export function TuesdayLoader({
  size = 24,
  tone = "light",
  label = "Chargement…",
  showLabel = false,
  className,
}: TuesdayLoaderProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={["tue-loader", className].filter(Boolean).join(" ")}
    >
      <TuesdayMark size={size} tone={tone} animation="loop" />
      {showLabel ? (
        <span className="tue-loader-label">{label}</span>
      ) : (
        <span className="tue-sr-only">{label}</span>
      )}
    </span>
  );
}

export interface TuesdayPageLoaderProps {
  label?: string;
  /** true = recouvre tout l'écran (splash). false = remplit la zone de contenu. */
  fullscreen?: boolean;
  leaving?: boolean;
}

/** Loader de page / de zone. Apparaît après 150 ms pour éviter les flashs. */
export function TuesdayPageLoader({
  label = "Chargement…",
  fullscreen = false,
  leaving = false,
}: TuesdayPageLoaderProps) {
  return (
    <div
      className="tue-page-loader"
      data-fullscreen={fullscreen ? "" : undefined}
      data-leaving={leaving ? "" : undefined}
    >
      <TuesdayLoader size={fullscreen ? 80 : 64} label={label} />
    </div>
  );
}
