export const STOCK_VISUAL_ACCEPT = "image/*,application/pdf,.pdf";

export function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function isPdfUrl(url: string): boolean {
  const normalized = url.split("?")[0]?.toLowerCase() ?? "";
  return normalized.endsWith(".pdf");
}

export function isStockVisualFile(file: File): boolean {
  return file.type.startsWith("image/") || isPdfFile(file);
}

export function stockVisualFileError(file: File): string | null {
  if (isStockVisualFile(file)) return null;
  return "Format non pris en charge. Utilisez une image (JPG, PNG…) ou un PDF.";
}

/** Paramètres d'affichage intégré (1re page, sans barre d'outils). */
export function pdfEmbedSrc(url: string): string {
  const base = url.split("#")[0] ?? url;
  return `${base}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH`;
}
