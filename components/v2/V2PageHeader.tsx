import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type V2PageHeaderProps = {
  kicker: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  aside?: ReactNode;
};

export default function V2PageHeader({ kicker, title, description, icon: Icon, aside }: V2PageHeaderProps) {
  return (
    <header className="ui-surface rounded-2xl border-l-4 border-l-[var(--accent)] px-5 py-4 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
            {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
            {kicker}
          </p>
          <h1 className="ui-heading mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[color:var(--foreground)]/55">{description}</p>
          ) : null}
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
    </header>
  );
}
