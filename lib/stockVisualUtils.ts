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
