import type { SupabaseClient } from "@supabase/supabase-js";

export const SALON_LOGOS_BUCKET = "salon-logos";
export const SALON_LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const SALON_LOGO_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/svg+xml,.jpg,.jpeg,.png,.webp,.gif,.svg";

export function isSalonLogoFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|svg)$/i.test(file.name);
}

export function salonLogoFileError(file: File): string | null {
  if (!isSalonLogoFile(file)) {
    return "Formats acceptés : JPG, PNG, WEBP, GIF ou SVG.";
  }
  if (file.size > SALON_LOGO_MAX_BYTES) {
    return "Image trop volumineuse (max. 2 Mo).";
  }
  return null;
}

export async function uploadSalonLogoFile(
  supabase: SupabaseClient,
  organizationId: string,
  salonId: string,
  file: File,
): Promise<{ storagePath: string; publicUrl: string } | { error: string }> {
  const err = salonLogoFileError(file);
  if (err) return { error: err };

  const extRaw = file.name.split(".").pop() ?? "png";
  const ext = extRaw.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "png";
  const contentType = file.type || (ext === "svg" ? "image/svg+xml" : "image/png");
  const storagePath = `${organizationId}/${salonId}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(SALON_LOGOS_BUCKET)
    .upload(storagePath, file, { upsert: false, contentType });
  if (upErr) return { error: upErr.message };

  const { data } = supabase.storage.from(SALON_LOGOS_BUCKET).getPublicUrl(storagePath);
  const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
  return { storagePath, publicUrl };
}

export async function removeSalonLogoFile(
  supabase: SupabaseClient,
  storagePath: string | null | undefined,
): Promise<void> {
  if (!storagePath) return;
  await supabase.storage.from(SALON_LOGOS_BUCKET).remove([storagePath]);
}

/** Extrait le path storage depuis une URL publique salon-logos (ignore le cache-bust). */
export function salonLogoPathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/object/public/${SALON_LOGOS_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const raw = url.slice(idx + marker.length).split("?")[0] ?? "";
  return raw ? decodeURIComponent(raw) : null;
}
