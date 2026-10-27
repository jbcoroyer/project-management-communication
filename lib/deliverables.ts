import type { SupabaseClient } from "@supabase/supabase-js";

export const DELIVERABLES_BUCKET = "deliverables";
export const DELIVERABLE_MAX_BYTES = 5 * 1024 * 1024;
export const DELIVERABLE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,application/pdf,.pdf,.jpg,.jpeg,.png,.webp,.gif";
/** Durée des URLs signées (1 h). */
export const DELIVERABLE_SIGNED_URL_SECONDS = 60 * 60;

export type Deliverable = {
  id: string;
  createdAt: string;
  completedAt: string;
  projectName: string;
  company: string;
  serverPath: string;
  fileName: string | null;
  fileMime: string | null;
  fileSizeBytes: number | null;
  storagePath: string | null;
  /** URL signée temporaire (jamais d’URL publique durable). */
  fileUrl: string | null;
  taskId: string | null;
  createdBy: string | null;
  notes: string;
};

type DeliverableRow = {
  id: string;
  created_at: string;
  completed_at: string;
  project_name: string;
  company: string;
  server_path: string;
  file_name: string | null;
  file_mime: string | null;
  file_size_bytes: number | null;
  storage_path: string | null;
  public_url: string | null;
  task_id: string | null;
  created_by: string | null;
  notes: string | null;
};

export function mapDeliverableRow(
  row: DeliverableRow,
  fileUrl: string | null = null,
): Deliverable {
  return {
    id: row.id,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    projectName: row.project_name,
    company: row.company ?? "",
    serverPath: row.server_path ?? "",
    fileName: row.file_name,
    fileMime: row.file_mime,
    fileSizeBytes: row.file_size_bytes,
    storagePath: row.storage_path,
    fileUrl,
    taskId: row.task_id,
    createdBy: row.created_by,
    notes: row.notes ?? "",
  };
}

export function isDeliverableFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  if (file.type === "application/pdf") return true;
  return /\.(pdf|jpe?g|png|webp|gif)$/i.test(file.name);
}

export function deliverableFileError(file: File): string | null {
  if (!isDeliverableFile(file)) {
    return "Formats acceptés : JPG, PNG, WEBP, GIF ou PDF.";
  }
  if (file.size > DELIVERABLE_MAX_BYTES) {
    return "Fichier trop volumineux (max. 5 Mo).";
  }
  return null;
}

export function isPdfDeliverable(
  d: Pick<Deliverable, "fileMime" | "fileName" | "fileUrl">,
): boolean {
  if (d.fileMime === "application/pdf") return true;
  const name = (d.fileName ?? d.fileUrl ?? "").toLowerCase();
  return name.includes(".pdf");
}

export async function signDeliverableUrl(
  supabase: SupabaseClient,
  storagePath: string | null | undefined,
  expiresIn = DELIVERABLE_SIGNED_URL_SECONDS,
): Promise<string | null> {
  if (!storagePath) return null;
  const { data, error } = await supabase.storage
    .from(DELIVERABLES_BUCKET)
    .createSignedUrl(storagePath, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function mapDeliverableRowsWithSignedUrls(
  supabase: SupabaseClient,
  rows: DeliverableRow[],
): Promise<Deliverable[]> {
  return Promise.all(
    rows.map(async (row) => {
      const fileUrl = await signDeliverableUrl(supabase, row.storage_path);
      return mapDeliverableRow(row, fileUrl);
    }),
  );
}

export async function uploadDeliverableFile(
  supabase: SupabaseClient,
  file: File,
): Promise<{ storagePath: string; fileUrl: string } | { error: string }> {
  const err = deliverableFileError(file);
  if (err) return { error: err };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session invalide. Reconnectez-vous." };

  const extRaw = file.name.split(".").pop() ?? (file.type === "application/pdf" ? "pdf" : "png");
  const ext = extRaw.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "png";
  const contentType = file.type || (ext === "pdf" ? "application/pdf" : "image/png");
  const storagePath = `${user.id}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(DELIVERABLES_BUCKET)
    .upload(storagePath, file, { upsert: false, contentType });
  if (upErr) return { error: upErr.message };

  const fileUrl = await signDeliverableUrl(supabase, storagePath);
  return { storagePath, fileUrl: fileUrl ?? "" };
}

export type CreateDeliverableInput = {
  projectName: string;
  company: string;
  serverPath: string;
  completedAt: string;
  notes?: string;
  taskId?: string | null;
  createdBy?: string | null;
  file?: File | null;
};

export async function createDeliverable(
  supabase: SupabaseClient,
  input: CreateDeliverableInput,
): Promise<{ deliverable: Deliverable } | { error: string }> {
  const projectName = input.projectName.trim();
  if (!projectName) return { error: "Indiquez le nom du projet." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session invalide. Reconnectez-vous." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();
  const organizationId = (profile?.organization_id as string | null) ?? null;
  if (!organizationId) return { error: "Aucun espace actif." };

  let storagePath: string | null = null;
  let fileUrl: string | null = null;
  let fileName: string | null = null;
  let fileMime: string | null = null;
  let fileSizeBytes: number | null = null;

  if (input.file) {
    const uploaded = await uploadDeliverableFile(supabase, input.file);
    if ("error" in uploaded) return uploaded;
    storagePath = uploaded.storagePath;
    fileUrl = uploaded.fileUrl || null;
    fileName = input.file.name;
    fileMime = input.file.type || null;
    fileSizeBytes = input.file.size;
  }

  const payload = {
    project_name: projectName,
    company: input.company.trim(),
    server_path: input.serverPath.trim(),
    completed_at: input.completedAt || new Date().toISOString().slice(0, 10),
    notes: input.notes?.trim() ?? "",
    task_id: input.taskId ?? null,
    created_by: input.createdBy ?? user.id,
    storage_path: storagePath,
    public_url: null,
    file_name: fileName,
    file_mime: fileMime,
    file_size_bytes: fileSizeBytes,
    organization_id: organizationId,
  };

  // Unicité task_id : si un livrable existe déjà pour la tâche, on le met à jour.
  if (payload.task_id) {
    const { data: existing } = await supabase
      .from("deliverables")
      .select("id, storage_path")
      .eq("task_id", payload.task_id)
      .maybeSingle();
    if (existing?.id) {
      const { data, error } = await supabase
        .from("deliverables")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error || !data) {
        return { error: error?.message ?? "Mise à jour impossible." };
      }
      if (
        storagePath &&
        existing.storage_path &&
        existing.storage_path !== storagePath
      ) {
        await supabase.storage.from(DELIVERABLES_BUCKET).remove([existing.storage_path]);
      }
      return {
        deliverable: mapDeliverableRow(data as DeliverableRow, fileUrl),
      };
    }
  }

  const { data, error } = await supabase.from("deliverables").insert(payload).select("*").single();
  if (error || !data) {
    if (error?.code === "23505" && payload.task_id) {
      return { error: "Un livrable existe déjà pour cette tâche." };
    }
    return { error: error?.message ?? "Enregistrement impossible." };
  }
  return { deliverable: mapDeliverableRow(data as DeliverableRow, fileUrl) };
}

export type UpdateDeliverableInput = {
  projectName: string;
  company: string;
  serverPath: string;
  completedAt: string;
  notes?: string;
  /** Nouveau fichier optionnel — remplace l’existant. */
  file?: File | null;
};

export async function updateDeliverable(
  supabase: SupabaseClient,
  item: Deliverable,
  input: UpdateDeliverableInput,
): Promise<{ deliverable: Deliverable } | { error: string }> {
  const projectName = input.projectName.trim();
  if (!projectName) return { error: "Indiquez le nom du projet." };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session invalide. Reconnectez-vous." };

  const payload: Record<string, unknown> = {
    project_name: projectName,
    company: input.company.trim(),
    server_path: input.serverPath.trim(),
    completed_at: input.completedAt || item.completedAt,
    notes: input.notes?.trim() ?? "",
  };

  let fileUrl: string | null = item.fileUrl;
  const previousStoragePath = item.storagePath;

  if (input.file) {
    const uploaded = await uploadDeliverableFile(supabase, input.file);
    if ("error" in uploaded) return uploaded;
    payload.storage_path = uploaded.storagePath;
    payload.public_url = null;
    payload.file_name = input.file.name;
    payload.file_mime = input.file.type || null;
    payload.file_size_bytes = input.file.size;
    fileUrl = uploaded.fileUrl || null;
  }

  const { data, error } = await supabase
    .from("deliverables")
    .update(payload)
    .eq("id", item.id)
    .select("*")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Mise à jour impossible." };
  }

  if (input.file && previousStoragePath && previousStoragePath !== payload.storage_path) {
    await supabase.storage.from(DELIVERABLES_BUCKET).remove([previousStoragePath]);
  }

  if (!fileUrl && (data as DeliverableRow).storage_path) {
    fileUrl = await signDeliverableUrl(supabase, (data as DeliverableRow).storage_path);
  }

  return { deliverable: mapDeliverableRow(data as DeliverableRow, fileUrl) };
}

export async function deleteDeliverable(
  supabase: SupabaseClient,
  item: Deliverable,
): Promise<{ error: string | null }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Session invalide. Reconnectez-vous." };

  if (item.storagePath) {
    await supabase.storage.from(DELIVERABLES_BUCKET).remove([item.storagePath]);
  }
  const { error } = await supabase.from("deliverables").delete().eq("id", item.id);
  return { error: error?.message ?? null };
}
