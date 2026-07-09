import IdenaLogo from "../IdenaLogo";

type SurveyBrandHeaderProps = {
  /** header = barre du haut ; hero = écran d'accueil */
  variant?: "header" | "hero";
};

export default function SurveyBrandHeader({ variant = "header" }: SurveyBrandHeaderProps) {
  const isHero = variant === "hero";

  if (isHero) {
    return (
      <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
        <IdenaLogo
          variant="wordmark"
          className="h-auto w-[min(100%,220px)] text-[var(--foreground)]"
          aria-label="IDENA"
        />
        <div className="hidden h-12 w-px bg-[var(--line)] sm:block" aria-hidden />
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/50">
          Service Communication
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <IdenaLogo variant="icon" className="h-11 w-11 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="text-lg font-bold leading-none tracking-tight text-[var(--foreground)]">IDENA</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/50">
          Service Communication
        </p>
      </div>
    </div>
  );
}
