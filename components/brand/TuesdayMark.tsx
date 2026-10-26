import type { SVGProps } from "react";

export type TuesdayTone = "light" | "dark" | "mono" | "white";
export type TuesdayAnimation = "none" | "once" | "loop";

export interface TuesdayMarkProps
  extends Omit<SVGProps<SVGSVGElement>, "children" | "title"> {
  /** Taille en px (ou toute valeur CSS). Minimum lisible : 16. */
  size?: number | string;
  /** light = fond clair · dark = fond sombre · mono = currentColor · white = sur terracotta/photo */
  tone?: TuesdayTone;
  /** none = fixe · once = entrée (reste affiché) · loop = loader */
  animation?: TuesdayAnimation;
  /** Si fourni, le symbole est annoncé aux lecteurs d'écran. Sinon il est décoratif. */
  title?: string;
}

/**
 * Symbole Tuesday — piste « Bloc » V1.
 * Grille 96 × 96. Trois blocs encre + un bloc terracotta (la tâche qui se pose).
 * Ne pas modifier la géométrie : c'est le logo.
 */
export function TuesdayMark({
  size = 32,
  tone = "light",
  animation = "none",
  title,
  className,
  ...rest
}: TuesdayMarkProps) {
  const labelled = Boolean(title);
  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      className={["tue-mark", className].filter(Boolean).join(" ")}
      data-tone={tone}
      data-anim={animation === "none" ? undefined : animation}
      role={labelled ? "img" : undefined}
      aria-label={title}
      aria-hidden={labelled ? undefined : true}
      focusable="false"
      {...rest}
    >
      {/* b4 en premier : pendant la chute il passe DERRIÈRE la barre */}
      <rect className="tue-b tue-b4" x={35} y={50} width={26} height={26} rx={7} />
      <rect className="tue-b tue-b1" x={5} y={20} width={26} height={26} rx={7} />
      <rect className="tue-b tue-b2" x={35} y={20} width={26} height={26} rx={7} />
      <rect className="tue-b tue-b3" x={65} y={20} width={26} height={26} rx={7} />
    </svg>
  );
}
