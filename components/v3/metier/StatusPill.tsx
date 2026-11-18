"use client";

const TONES: Record<string, string> = {
  vert: "bg-emerald-500/15 text-emerald-700",
  orange: "bg-amber-500/15 text-amber-700",
  rouge: "bg-rose-500/15 text-rose-700",
  neutre: "bg-[var(--surface-soft)] text-[color:var(--foreground)]/70",
  accent: "bg-[var(--accent)]/12 text-[var(--accent)]",
};

export default function StatusPill({
  label,
  tone = "neutre",
}: {
  label: string;
  tone?: keyof typeof TONES | string;
}) {
  const cls = TONES[tone] ?? TONES.neutre;
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}
