import type { LucideIcon } from "lucide-react";

export type V2SegmentItem<T extends string> = {
  id: T;
  label: string;
  icon?: LucideIcon;
  badge?: number;
};

type V2SegmentedProps<T extends string> = {
  items: V2SegmentItem<T>[];
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  className?: string;
};

export default function V2Segmented<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  className,
}: V2SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={[
        "flex items-center gap-0.5 overflow-x-auto rounded-xl bg-[var(--surface-soft)]/80 p-0.5",
        className ?? "",
      ].join(" ")}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.id === value;
        const showBadge = typeof item.badge === "number" && item.badge > 0;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={[
              "ui-transition inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium",
              active
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-[var(--line)]"
                : "text-[color:var(--foreground)]/50 hover:text-[color:var(--foreground)]/80",
            ].join(" ")}
          >
            {Icon ? <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden /> : null}
            <span>{item.label}</span>
            {showBadge ? (
              <span
                className={[
                  "rounded-full px-1.5 py-px text-[10px] font-medium tabular-nums",
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "bg-[color:var(--foreground)]/8 text-[color:var(--foreground)]/55",
                ].join(" ")}
              >
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
