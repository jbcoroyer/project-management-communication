import type { ReactNode } from "react";
import Kicker from "./Kicker";

export default function PageHeader(props: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  /** Titre plus grand (pages vitrine) */
  size?: "default" | "hero";
}) {
  const isHero = props.size === "hero";
  return (
    <header
      className={[
        "flex flex-wrap items-start justify-between gap-4",
        props.className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="min-w-0 flex-1">
        {props.kicker ? <Kicker className="mb-2">{props.kicker}</Kicker> : null}
        <h1
          className={[
            "ui-display text-[var(--foreground)]",
            isHero ? "text-3xl sm:text-4xl" : "text-2xl sm:text-[1.75rem]",
          ].join(" ")}
        >
          {props.title}
        </h1>
        {props.description ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color:var(--foreground)]/60">
            {props.description}
          </p>
        ) : null}
      </div>
      {props.actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{props.actions}</div>
      ) : null}
    </header>
  );
}
