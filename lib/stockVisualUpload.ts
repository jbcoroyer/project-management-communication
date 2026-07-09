import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "stock-plv-visuals";

export async function uploadStockVisual(
  supabase: SupabaseClient,
  file: File,
  folder: "print" | "goodies" | "plv",
): Promise<{ url: string | null; error: string | null }> {
  const extRaw = file.name.split(".").pop() ?? "png";
  const ext = extRaw.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "png";
  const path = `${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) return { url: null, error: upErr.message };
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
