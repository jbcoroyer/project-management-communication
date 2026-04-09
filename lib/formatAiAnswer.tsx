import type { ReactNode } from "react";

type Section = {
  title: string;
  lines: string[];
};

function looksLikeSectionTitle(line: string): string | null {
  const sectionOnly = line.match(/^\*\*(.+)\*\*$/);
  if (sectionOnly) return sectionOnly[1].trim();

  const cleaned = line.replace(/^[-*]\s+/, "").trim();
  const normalized = cleaned.toLowerCase();
  const knownSectionStarts = [
    "plan de la semaine",
    "priorites",
    "priorités",
    "a lancer aujourd'hui",
    "à lancer aujourd'hui",
    "risques / blocages",
    "risques/blocages",
    "risques",
    "blocages",
    "prochaine revue",
    "a faire",
    "à faire",
    "termine",
    "terminé",
  ];
  if (knownSectionStarts.some((start) => normalized.startsWith(start))) {
    return cleaned;
  }
  if (cleaned.endsWith(":") && cleaned.length < 44) {
    return cleaned.slice(0, -1).trim();
  }
  return null;
}

function splitFrenchQuoteSegments(text: string): ReactNode[] {
  const parts = text.split(/(«[^»]+»)/g).filter(Boolean);
  return parts.map((part, idx) => {
    if (/^«[^»]+»$/.test(part)) {
      return (
        <span
          key={`q-${idx}`}
          className="mx-0.5 inline-flex rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/12 px-2 py-[1px] text-[12px] font-semibold text-[var(--foreground)]"
        >
          {part}
        </span>
      );
    }
    return <span key={`t-${idx}`}>{part}</span>;
  });
}

function renderRichText(text: string): ReactNode {
  const parts = text.split(/\*\*/);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-[var(--foreground)]">
        {splitFrenchQuoteSegments(part)}
      </strong>
    ) : (
      <span key={i}>{splitFrenchQuoteSegments(part)}</span>
    ),
  );
}

/**
 * Si le modèle renvoie tout sur une ligne, insère des retours avant sections / items.
 */
export function normalizeAiLineBreaks(raw: string): string {
  let t = raw.trim();
  if (!t) return t;
  if (t.includes("\n")) return t;

  t = t.replace(/\s*\*\*([^*]+)\*\*\s*/g, "\n\n**$1**\n");
  t = t.replace(/\s+(\d+\))\s+/g, "\n$1 ");
  t = t.replace(/\s+-\s+/g, "\n- ");
  return t.replace(/\n{3,}/g, "\n\n").trim();
}

export function AiAnswerContent({ text }: { text: string }) {
  const normalized = normalizeAiLineBreaks(text);
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    const title = looksLikeSectionTitle(line);
    if (title) {
      if (current && current.lines.length > 0) sections.push(current);
      current = { title, lines: [] };
      continue;
    }
    if (!current) current = { title: "Priorites", lines: [] };
    current.lines.push(line);
  }
  if (current && current.lines.length > 0) sections.push(current);

  const hasStructuredSections = sections.length > 0;

  return (
    <div className="rounded-xl border border-[var(--line)] bg-gradient-to-b from-[var(--surface)] to-[var(--surface-soft)]/55 p-4 text-sm text-[var(--foreground)]">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/60">
          Reponse IA
        </p>
        <span className="rounded-full border border-[var(--line)] bg-[var(--surface-soft)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--foreground)]/70">
          Actionnable
        </span>
      </div>

      <div className="space-y-3">
        {hasStructuredSections ? (
          sections.map((section, idx) => (
            <section key={`${section.title}-${idx}`} className="rounded-lg border border-[var(--line)]/80 bg-[var(--surface)]/80 p-3">
              <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[color:var(--foreground)]/72">
                {section.title}
              </h4>
              <ul className="space-y-1.5">
                {section.lines.map((line, li) => {
                  const cleaned = line.replace(/^\d+\)\s+/, "").replace(/^[-*]\s+/, "");
                  return (
                    <li key={li} className="flex gap-2 text-[13px] leading-relaxed">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]/65" />
                      <span>{renderRichText(cleaned)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        ) : (
          <ul className="space-y-1.5">
            {lines.map((line, idx) => (
              <li key={idx} className="flex gap-2 text-[13px] leading-relaxed">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]/65" />
                <span>{renderRichText(line)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
