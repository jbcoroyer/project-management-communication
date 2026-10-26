import type { CSSProperties } from "react";
import { TuesdayMark, type TuesdayTone } from "./TuesdayMark";

export interface TuesdayLogoProps {
  /** Hauteur du symbole en px. Le mot est calculé à 0,72 × size. Sidebar : 36–40. */
  size?: number;
  tone?: TuesdayTone;
  /**
   * Joue l'entrée (blocs qui tombent puis le mot qui glisse) au montage.
   * Dans un layout persistant (sidebar), ça ne se joue donc qu'au chargement
   * complet de la page, pas à chaque navigation.
   */
  intro?: boolean;
  /** Symbole seul (sidebar repliée, mobile). */
  markOnly?: boolean;
  className?: string;
}

export function TuesdayLogo({
  size = 36,
  tone = "light",
  intro = false,
  markOnly = false,
  className,
}: TuesdayLogoProps) {
  return (
    <span
      className={["tue-logo", className].filter(Boolean).join(" ")}
      data-tone={tone}
      data-intro={intro ? "" : undefined}
      style={{ "--tue-logo-size": `${size}px` } as CSSProperties}
      role="img"
      aria-label="Tuesday"
    >
      <TuesdayMark size={size} tone={tone} animation={intro ? "once" : "none"} />
      {!markOnly && (
        <span className="tue-wordmark" aria-hidden="true">
          Tuesday
        </span>
      )}
    </span>
  );
}
