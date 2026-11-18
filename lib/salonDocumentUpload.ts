import type { SupabaseClient } from "@supabase/supabase-js";

export const SALON_DOCUMENTS_BUCKET = "salon-documents";
export const SALON_DOC_MAX_BYTES = 5 * 1024 * 1024;
export const SALON_DOC_ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,image/gif,.pdf,.jpg,.jpeg,.png,.webp,.gif";
export const SALON_DOC_SIGNED_URL_SECONDS = 60 * 60;

export function isSalonDocFile(file: File): boolean {
  if (file.type === "application/pdf") return true;
  if (file.type.startsWith("image/")) return true;
  return /\.(pdf|jpe?g|png|webp|gif)$/i.test(file.name);
}

export function salonDocFileError(file: File): string | null {
  if (!isSalonDocFile(file)) {
    return "Formats acceptés : PDF, JPG, PNG, WEBP ou GIF.";
  }
  if (file.size > SALON_DOC_MAX_BYTES) {
    return "Fichier trop volumineux (max. 5 Mo).";
  }
  return null;
}

export async function signSalonDocUrl(
  supabase: SupabaseClient,
  storagePath: string | null | undefined,
  expiresIn = SALON_DOC_SIGNED_URL_SECONDS,
): Promise<string | null> {
  if (!storagePath) return null;
  const { data, error } = await supabase.storage
    .from(SALON_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function uploadSalonDocumentFile(
  supabase: SupabaseClient,
  organizationId: string,
  salonId: string,
  file: File,
): Promise<{ storagePath: string; fileUrl: string } | { error: string }> {
  const err = salonDocFileError(file);
  if (err) return { error: err };

  const extRaw = file.name.split(".").pop() ?? (file.type === "application/pdf" ? "pdf" : "png");
  const ext = extRaw.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "bin";
  const contentType = file.type || (ext === "pdf" ? "application/pdf" : "application/octet-stream");
  const storagePath = `${organizationId}/${salonId}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(SALON_DOCUMENTS_BUCKET)
    .upload(storagePath, file, { upsert: false, contentType });
  if (upErr) return { error: upErr.message };

  const fileUrl = await signSalonDocUrl(supabase, storagePath);
  return { storagePath, fileUrl: fileUrl ?? "" };
}

export async function removeSalonDocumentFile(
  supabase: SupabaseClient,
  storagePath: string | null | undefined,
): Promise<void> {
  if (!storagePath) return;
  await supabase.storage.from(SALON_DOCUMENTS_BUCKET).remove([storagePath]);
}
