import type { CSSProperties } from "react";
import { TuesdayMark, type TuesdayAnimation, type TuesdayTone } from "./TuesdayMark";

export interface TuesdayLogoProps {
  /** Hauteur du symbole en px. Le mot est calculé à 0,72 × size. Sidebar : 36–40. */
  size?: number;
  tone?: TuesdayTone;
  /**
   * Joue l'entrée (blocs qui tombent puis le mot qui glisse) au montage.
   * Dans un layout persistant (sidebar), ça ne se joue donc qu'au chargement
   * complet de la page, pas à chaque navigation.
   * Ignoré si `animation` est fourni.
   */
  intro?: boolean;
  /**
   * none = fixe · once = entrée · loop = animation continue (ex. login).
   * Par défaut : once si intro, sinon none.
   */
  animation?: TuesdayAnimation;
  /** Symbole seul (sidebar repliée, mobile). */
  markOnly?: boolean;
  className?: string;
}

export function TuesdayLogo({
  size = 36,
  tone = "light",
  intro = false,
  animation,
  markOnly = false,
  className,
}: TuesdayLogoProps) {
  const markAnimation: TuesdayAnimation =
    animation ?? (intro ? "once" : "none");
  return (
    <span
      className={["tue-logo", className].filter(Boolean).join(" ")}
      data-tone={tone}
      data-intro={markAnimation === "once" ? "" : undefined}
      style={{ "--tue-logo-size": `${size}px` } as CSSProperties}
      role="img"
      aria-label="Tuesday"
    >
      <TuesdayMark size={size} tone={tone} animation={markAnimation} />
      {!markOnly && (
        <span className="tue-wordmark" aria-hidden="true">
          Tuesday
        </span>
      )}
    </span>
  );
}
