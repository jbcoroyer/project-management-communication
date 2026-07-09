"use client";

import { isPdfUrl, pdfEmbedSrc } from "../../lib/stockVisualUtils";

type StockVisualPreviewProps = {
  url: string;
  name: string;
  mode?: "thumb" | "detail" | "full";
  className?: string;
};

function PdfEmbed({
  url,
  name,
  className,
  badge = false,
}: {
  url: string;
  name: string;
  className?: string;
  badge?: boolean;
}) {
  return (
    <div className={["relative overflow-hidden bg-slate-100", className].filter(Boolean).join(" ")}>
      <iframe
        src={pdfEmbedSrc(url)}
        title={name}
        className="pointer-events-none absolute inset-0 h-full w-full border-0 bg-white"
        tabIndex={-1}
      />
      {badge ? (
        <span className="absolute bottom-1.5 right-1.5 rounded border border-rose-200/90 bg-white/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700 shadow-sm backdrop-blur-sm">
          PDF
        </span>
      ) : null}
    </div>
  );
}

export default function StockVisualPreview({
  url,
  name,
  mode = "thumb",
  className = "",
}: StockVisualPreviewProps) {
  if (isPdfUrl(url)) {
    if (mode === "thumb") {
      return <PdfEmbed url={url} name={name} className={["h-full w-full", className].join(" ")} badge />;
    }

    const heightClass =
      mode === "full" ? "h-[80vh] min-h-[20rem]" : "h-full min-h-[14rem] rounded-lg border border-[var(--line)]";
    return <PdfEmbed url={url} name={name} className={[heightClass, className].join(" ")} />;
  }

  const objectClass =
    mode === "thumb"
      ? "h-full w-full object-cover"
      : mode === "full"
        ? "h-full max-h-[80vh] w-full object-contain"
        : "h-52 w-full rounded-lg border border-[var(--line)] bg-white object-contain";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={name} className={[objectClass, className].filter(Boolean).join(" ")} />
  );
}
