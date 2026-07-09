import Image from "next/image";

const SURVEY_IDENA_LOGO = "/idena-logo-square.png";

type SurveyBrandHeaderProps = {
  /** header = barre du haut ; hero = écran d'accueil */
  variant?: "header" | "hero";
};

export default function SurveyBrandHeader({ variant = "header" }: SurveyBrandHeaderProps) {
  const isHero = variant === "hero";

  return (
    <div
      className={[
        "flex items-center gap-3",
        isHero ? "mb-8" : "",
      ].join(" ")}
    >
      <div
        className={[
          "relative shrink-0 overflow-hidden rounded-xl bg-white shadow-[0_8px_24px_rgba(20,17,13,0.08)] ring-1 ring-[var(--line)]",
          isHero ? "h-[4.5rem] w-[4.5rem] sm:h-20 sm:w-20" : "h-11 w-11",
        ].join(" ")}
      >
        <Image
          src={SURVEY_IDENA_LOGO}
          alt="Logo IDENA"
          fill
          className="object-contain p-1"
          sizes={isHero ? "80px" : "44px"}
          priority
        />
      </div>
      <div className="min-w-0">
        <p
          className={[
            "font-bold tracking-tight text-[var(--foreground)]",
            isHero ? "text-3xl sm:text-4xl" : "text-lg leading-none",
          ].join(" ")}
        >
          IDENA
        </p>
        <p
          className={[
            "font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/50",
            isHero ? "mt-1.5 text-xs" : "mt-1 text-[10px]",
          ].join(" ")}
        >
          Service Communication
        </p>
      </div>
    </div>
  );
}
