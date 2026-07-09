import type { SupabaseClient } from "@supabase/supabase-js";
import { isStockVisualFile } from "./stockVisualUtils";

const BUCKET = "stock-plv-visuals";

export async function uploadStockVisual(
  supabase: SupabaseClient,
  file: File,
  folder: "print" | "goodies" | "plv",
): Promise<{ url: string | null; error: string | null }> {
  if (!isStockVisualFile(file)) {
    return { url: null, error: "Format non pris en charge. Utilisez une image ou un PDF." };
  }

  const extRaw = file.name.split(".").pop() ?? (file.type === "application/pdf" ? "pdf" : "png");
  const ext = extRaw.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "png";
  const contentType = file.type || (ext === "pdf" ? "application/pdf" : "image/png");
  const path = `${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType });
  if (upErr) return { url: null, error: upErr.message };
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
