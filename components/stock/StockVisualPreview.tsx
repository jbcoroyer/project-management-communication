"use client";

import { FileText } from "lucide-react";
import { isPdfUrl } from "../../lib/stockVisualUtils";

type StockVisualPreviewProps = {
  url: string;
  name: string;
  mode?: "thumb" | "detail" | "full";
  className?: string;
};

export default function StockVisualPreview({
  url,
  name,
  mode = "thumb",
  className = "",
}: StockVisualPreviewProps) {
  if (isPdfUrl(url)) {
    if (mode === "thumb") {
      return (
        <div
          className={[
            "flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-rose-50 via-white to-slate-50",
            className,
          ].join(" ")}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-white shadow-sm">
            <FileText className="h-7 w-7 text-rose-600" />
          </div>
          <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-rose-700">
            PDF
          </span>
        </div>
      );
    }

    const heightClass = mode === "full" ? "h-[80vh]" : mode === "detail" ? "h-full min-h-[14rem]" : "h-52";
    return (
      <iframe
        src={url}
        title={name}
        className={["w-full rounded-lg border border-[var(--line)] bg-white", heightClass, className].join(" ")}
      />
    );
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
