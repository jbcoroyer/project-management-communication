"use client";

import { isPdfUrl, pdfEmbedSrc } from "../../lib/stockVisualUtils";

type StockVisualPreviewProps = {
  url: string;
  name: string;
  mode?: "thumb" | "detail" | "full";
  className?: string;
};

/** Format page A4 portrait (210 × 297 mm). */
const A4_ASPECT = "aspect-[210/297]";

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
    <div className={["relative overflow-hidden bg-white", className].filter(Boolean).join(" ")}>
      {/*
        Chrome ignore #scrollbar=0 : on agrandit l’iframe et on clippe
        pour masquer les barres de défilement internes du viewer PDF.
      */}
      <iframe
        src={pdfEmbedSrc(url)}
        title={name}
        className="pointer-events-none absolute left-0 top-0 border-0 bg-white"
        style={{ width: "calc(100% + 22px)", height: "calc(100% + 22px)" }}
        tabIndex={-1}
      />
      {badge ? (
        <span className="absolute bottom-1.5 right-1.5 z-[1] rounded border border-rose-200/90 bg-white/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700 shadow-sm backdrop-blur-sm">
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
    if (mode === "full") {
      return (
        <div className={["mx-auto w-full max-w-[min(100%,28rem)]", A4_ASPECT, className].filter(Boolean).join(" ")}>
          <PdfEmbed url={url} name={name} className="h-full w-full rounded-lg border border-[var(--line)] shadow-sm" />
        </div>
      );
    }

    return (
      <PdfEmbed
        url={url}
        name={name}
        badge={mode === "thumb"}
        className={[A4_ASPECT, "w-full", mode === "detail" ? "rounded-lg border border-[var(--line)]" : "", className]
          .filter(Boolean)
          .join(" ")}
      />
    );
  }

  if (mode === "full") {
    return (
      <div className={["mx-auto flex w-full max-w-[min(100%,28rem)] items-center justify-center", A4_ASPECT, className].filter(Boolean).join(" ")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={name} className="max-h-full max-w-full object-contain" />
      </div>
    );
  }

  return (
    <div
      className={[
        A4_ASPECT,
        "w-full overflow-hidden bg-white",
        mode === "detail" ? "rounded-lg border border-[var(--line)]" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={name} className="h-full w-full object-contain object-center" />
    </div>
  );
}
