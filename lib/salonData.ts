import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Salon,
  SalonBudgetLine,
  SalonChecklistItem,
  SalonContact,
  SalonDocCategory,
  SalonDocKind,
  SalonDocument,
  SalonMode,
  SalonStatus,
} from "./salonTypes";
import {
  checklistTemplateForMode,
  contactsTemplateForMode,
  dateFromDaysBeforeStart,
} from "./salonTemplates";
import { SALON_SEED_2026 } from "./salonSeed";
import { matchCatalogFromName } from "./salonCatalog";
import {
  createTaskForChecklistItem,
  syncChecklistItemsToBoard,
  syncChecklistPatchToTask,
} from "./salonTaskSync";
import {
  removeSalonDocumentFile,
  signSalonDocUrl,
  uploadSalonDocumentFile,
} from "./salonDocumentUpload";

type SalonRow = {
  id: string;
  organization_id: string;
  name: string;
  mode: string;
  status: string;
  location: string;
  start_date: string;
  end_date: string;
  hall: string;
  stand_number: string;
  surface_m2: number | null;
  notes: string;
  catalog_slug?: string | null;
  logo_url?: string | null;
  created_at: string;
  updated_at: string;
};

type ChecklistRow = {
  id: string;
  organization_id: string;
  salon_id: string;
  label: string;
  due_date: string | null;
  done: boolean;
  sort_order: number;
  document_id: string | null;
  task_id?: string | null;
};

type DocRow = {
  id: string;
  organization_id: string;
  salon_id: string;
  category: string;
  doc_kind?: string | null;
  title: string;
  description?: string | null;
  url: string;
  storage_path?: string | null;
  file_name?: string | null;
  file_mime?: string | null;
  file_size_bytes?: number | null;
  amount_ht: number | null;
  amount_ttc: number | null;
  due_date: string | null;
};

type ContactRow = {
  id: string;
  organization_id: string;
  salon_id: string;
  label: string;
  value: string;
  sort_order: number;
};

type BudgetRow = {
  id: string;
  organization_id: string;
  salon_id: string;
  label: string;
  category: string;
  amount_ht: number | string;
  amount_ttc: number | string;
  due_date: string | null;
  paid: boolean;
  document_id: string | null;
};

export function mapSalon(row: SalonRow): Salon {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    mode: row.mode as SalonMode,
    status: row.status as SalonStatus,
    location: row.location ?? "",
    startDate: row.start_date,
    endDate: row.end_date,
    hall: row.hall ?? "",
    standNumber: row.stand_number ?? "",
    surfaceM2: row.surface_m2 == null ? null : Number(row.surface_m2),
    notes: row.notes ?? "",
    catalogSlug: row.catalog_slug ?? matchCatalogFromName(row.name)?.slug ?? null,
    logoUrl: row.logo_url ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapChecklist(row: ChecklistRow): SalonChecklistItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    salonId: row.salon_id,
    label: row.label,
    dueDate: row.due_date,
    done: Boolean(row.done),
    sortOrder: row.sort_order,
    documentId: row.document_id,
    taskId: row.task_id ?? null,
  };
}

function mapDoc(row: DocRow, signedUrl?: string | null): SalonDocument {
  const storagePath = row.storage_path ?? null;
  const externalUrl = row.url ?? "";
  return {
    id: row.id,
    organizationId: row.organization_id,
    salonId: row.salon_id,
    category: row.category as SalonDocCategory,
    docKind: (row.doc_kind as SalonDocKind) || "autre",
    title: row.title,
    description: row.description ?? "",
    url: signedUrl || externalUrl,
    storagePath,
    fileName: row.file_name ?? null,
    fileMime: row.file_mime ?? null,
    fileSizeBytes: row.file_size_bytes == null ? null : Number(row.file_size_bytes),
    amountHt: row.amount_ht == null ? null : Number(row.amount_ht),
    amountTtc: row.amount_ttc == null ? null : Number(row.amount_ttc),
    dueDate: row.due_date,
  };
}

function mapContact(row: ContactRow): SalonContact {
  return {
    id: row.id,
    organizationId: row.organization_id,
    salonId: row.salon_id,
    label: row.label,
    value: row.value ?? "",
    sortOrder: row.sort_order,
  };
}

function mapBudget(row: BudgetRow): SalonBudgetLine {
  return {
    id: row.id,
    organizationId: row.organization_id,
    salonId: row.salon_id,
    label: row.label,
    category: row.category,
    amountHt: Number(row.amount_ht) || 0,
    amountTtc: Number(row.amount_ttc) || 0,
    dueDate: row.due_date,
    paid: Boolean(row.paid),
    documentId: row.document_id,
  };
}

export async function fetchSalons(supabase: SupabaseClient, organizationId: string): Promise<Salon[]> {
  const { data, error } = await supabase
    .from("salons")
    .select("*")
    .eq("organization_id", organizationId)
    .order("start_date", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as SalonRow[]).map(mapSalon);
}

export async function fetchSalonById(
  supabase: SupabaseClient,
  organizationId: string,
  salonId: string,
): Promise<Salon | null> {
  const { data, error } = await supabase
    .from("salons")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", salonId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapSalon(data as SalonRow) : null;
}

export async function fetchChecklist(
  supabase: SupabaseClient,
  organizationId: string,
  salonId?: string,
): Promise<SalonChecklistItem[]> {
  let q = supabase
    .from("salon_checklist_items")
    .select("*")
    .eq("organization_id", organizationId)
    .order("sort_order", { ascending: true });
  if (salonId) q = q.eq("salon_id", salonId);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as ChecklistRow[]).map(mapChecklist);
}

export async function fetchDocuments(
  supabase: SupabaseClient,
  organizationId: string,
  salonId: string,
): Promise<SalonDocument[]> {
  const { data, error } = await supabase
    .from("salon_documents")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("salon_id", salonId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as DocRow[];
  return Promise.all(
    rows.map(async (row) => {
      const signed = await signSalonDocUrl(supabase, row.storage_path);
      return mapDoc(row, signed);
    }),
  );
}

export async function fetchContacts(
  supabase: SupabaseClient,
  organizationId: string,
  salonId: string,
): Promise<SalonContact[]> {
  const { data, error } = await supabase
    .from("salon_contacts")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("salon_id", salonId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as ContactRow[]).map(mapContact);
}

export async function fetchBudgetLines(
  supabase: SupabaseClient,
  organizationId: string,
  salonId?: string,
): Promise<SalonBudgetLine[]> {
  let q = supabase.from("salon_budget_lines").select("*").eq("organization_id", organizationId);
  if (salonId) q = q.eq("salon_id", salonId);
  const { data, error } = await q.order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as BudgetRow[]).map(mapBudget);
}

async function insertTemplateRows(
  supabase: SupabaseClient,
  organizationId: string,
  salonId: string,
  mode: SalonMode,
  startDate: string,
) {
  const checklist = checklistTemplateForMode(mode).map((item, i) => ({
    organization_id: organizationId,
    salon_id: salonId,
    label: item.label,
    due_date: dateFromDaysBeforeStart(startDate, item.daysBeforeStart),
    done: false,
    sort_order: i,
  }));
  const contacts = contactsTemplateForMode(mode).map((c, i) => ({
    organization_id: organizationId,
    salon_id: salonId,
    label: c.label,
    value: c.value,
    sort_order: i,
  }));
  if (checklist.length) {
    const { error } = await supabase.from("salon_checklist_items").insert(checklist);
    if (error) throw error;
  }
  if (contacts.length) {
    const { error } = await supabase.from("salon_contacts").insert(contacts);
    if (error) throw error;
  }
}

export type CreateSalonInput = {
  name: string;
  mode: SalonMode;
  location: string;
  startDate: string;
  endDate: string;
  hall?: string;
  standNumber?: string;
  surfaceM2?: number | null;
  notes?: string;
  catalogSlug?: string | null;
  /** Nom affiché pour les tâches tableau / agenda. */
  adminName?: string | null;
  /** Si false, ne pousse pas la checklist sur le board (défaut: true). */
  syncToBoard?: boolean;
};

export async function createSalon(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string | null,
  input: CreateSalonInput,
): Promise<Salon> {
  const catalogSlug =
    input.catalogSlug?.trim() || matchCatalogFromName(input.name)?.slug || null;
  const { data, error } = await supabase
    .from("salons")
    .insert({
      organization_id: organizationId,
      name: input.name.trim(),
      mode: input.mode,
      status: "preparation",
      location: input.location.trim(),
      start_date: input.startDate,
      end_date: input.endDate,
      hall: input.hall?.trim() ?? "",
      stand_number: input.standNumber?.trim() ?? "",
      surface_m2: input.surfaceM2 ?? null,
      notes: input.notes?.trim() ?? "",
      catalog_slug: catalogSlug,
      created_by: userId,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Création salon impossible");
  const salon = mapSalon(data as SalonRow);
  await insertTemplateRows(supabase, organizationId, salon.id, salon.mode, salon.startDate);
  if (input.syncToBoard !== false) {
    const checklist = await fetchChecklist(supabase, organizationId, salon.id);
    await syncChecklistItemsToBoard({
      supabase,
      organizationId,
      salonId: salon.id,
      salonName: salon.name,
      mode: salon.mode,
      endDate: salon.endDate,
      status: salon.status,
      items: checklist.map((c) => ({
        id: c.id,
        label: c.label,
        dueDate: c.dueDate,
        done: c.done,
      })),
      adminName: input.adminName ?? "",
    });
  }
  return salon;
}

export async function updateSalon(
  supabase: SupabaseClient,
  salonId: string,
  patch: Partial<{
    name: string;
    mode: SalonMode;
    status: SalonStatus;
    location: string;
    startDate: string;
    endDate: string;
    hall: string;
    standNumber: string;
    surfaceM2: number | null;
    notes: string;
    logoUrl: string | null;
  }>,
): Promise<Salon> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name != null) row.name = patch.name;
  if (patch.mode != null) row.mode = patch.mode;
  if (patch.status != null) row.status = patch.status;
  if (patch.location != null) row.location = patch.location;
  if (patch.startDate != null) row.start_date = patch.startDate;
  if (patch.endDate != null) row.end_date = patch.endDate;
  if (patch.hall != null) row.hall = patch.hall;
  if (patch.standNumber != null) row.stand_number = patch.standNumber;
  if (patch.surfaceM2 !== undefined) row.surface_m2 = patch.surfaceM2;
  if (patch.notes != null) row.notes = patch.notes;
  if (patch.logoUrl !== undefined) row.logo_url = patch.logoUrl;
  const { data, error } = await supabase.from("salons").update(row).eq("id", salonId).select("*").single();
  if (error || !data) throw error ?? new Error("Mise à jour impossible");
  return mapSalon(data as SalonRow);
}

export async function deleteSalon(supabase: SupabaseClient, salonId: string): Promise<void> {
  const { error } = await supabase.from("salons").delete().eq("id", salonId);
  if (error) throw error;
}

export async function cloneSalon(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string | null,
  source: Salon,
  input: { name: string; startDate: string; endDate: string },
): Promise<Salon> {
  return createSalon(supabase, organizationId, userId, {
    name: input.name,
    mode: source.mode,
    location: source.location,
    startDate: input.startDate,
    endDate: input.endDate,
    hall: source.hall,
    standNumber: source.standNumber,
    surfaceM2: source.surfaceM2,
    notes: source.notes,
  });
}

export async function updateChecklistItem(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<{ done: boolean; dueDate: string | null; label: string }>,
): Promise<SalonChecklistItem> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.done != null) row.done = patch.done;
  if (patch.dueDate !== undefined) row.due_date = patch.dueDate;
  if (patch.label != null) row.label = patch.label;
  const { data, error } = await supabase
    .from("salon_checklist_items")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Checklist impossible");
  const item = mapChecklist(data as ChecklistRow);
  await syncChecklistPatchToTask(supabase, {
    taskId: item.taskId,
    done: patch.done ?? item.done,
    dueDate: patch.dueDate !== undefined ? patch.dueDate : item.dueDate,
    label: patch.label ?? item.label,
  });
  return item;
}

export async function addChecklistItem(
  supabase: SupabaseClient,
  organizationId: string,
  salonId: string,
  label: string,
  dueDate: string | null,
  sortOrder: number,
  opts?: {
    salonName?: string;
    mode?: SalonMode;
    adminName?: string;
    endDate?: string | null;
    status?: SalonStatus | null;
  },
): Promise<SalonChecklistItem> {
  const { data, error } = await supabase
    .from("salon_checklist_items")
    .insert({
      organization_id: organizationId,
      salon_id: salonId,
      label: label.trim(),
      due_date: dueDate,
      done: false,
      sort_order: sortOrder,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Ajout impossible");
  const item = mapChecklist(data as ChecklistRow);
  const today = new Date().toISOString().slice(0, 10);
  const past =
    opts?.status === "termine" ||
    (typeof opts?.endDate === "string" && opts.endDate.slice(0, 10) < today);
  if (opts?.salonName && opts.mode && !past) {
    const taskId = await createTaskForChecklistItem({
      supabase,
      organizationId,
      salonId,
      salonName: opts.salonName,
      mode: opts.mode,
      checklistItemId: item.id,
      label: item.label,
      dueDate: item.dueDate,
      adminName: opts.adminName ?? "",
    });
    if (taskId) return { ...item, taskId };
  }
  return item;
}

export type AddSalonDocumentInput = {
  category: SalonDocCategory;
  docKind?: SalonDocKind;
  title: string;
  description?: string;
  url?: string;
  file?: File | null;
  amountHt?: number | null;
  amountTtc?: number | null;
  dueDate?: string | null;
  /** Si devis/facture : crée aussi une ligne budget engagé liée. */
  createBudgetLine?: boolean;
};

export async function addDocument(
  supabase: SupabaseClient,
  organizationId: string,
  salonId: string,
  input: AddSalonDocumentInput,
): Promise<{ document: SalonDocument; budgetLine: SalonBudgetLine | null }> {
  const title = input.title.trim();
  if (!title) throw new Error("Indiquez un titre.");

  const docKind: SalonDocKind = input.docKind ?? "autre";
  const isCostDoc = docKind === "devis" || docKind === "facture";
  const amountTtc =
    input.amountTtc != null && Number.isFinite(input.amountTtc) ? Number(input.amountTtc) : null;
  const amountHt =
    input.amountHt != null && Number.isFinite(input.amountHt) ? Number(input.amountHt) : null;

  if (isCostDoc && (amountTtc == null || amountTtc <= 0) && (amountHt == null || amountHt <= 0)) {
    throw new Error("Montant obligatoire pour un devis ou une facture.");
  }

  let storagePath: string | null = null;
  let fileName: string | null = null;
  let fileMime: string | null = null;
  let fileSizeBytes: number | null = null;
  let signedUrl: string | null = null;
  let externalUrl = input.url?.trim() ?? "";

  if (input.file) {
    const uploaded = await uploadSalonDocumentFile(
      supabase,
      organizationId,
      salonId,
      input.file,
    );
    if ("error" in uploaded) throw new Error(uploaded.error);
    storagePath = uploaded.storagePath;
    signedUrl = uploaded.fileUrl || null;
    fileName = input.file.name;
    fileMime = input.file.type || null;
    fileSizeBytes = input.file.size;
    if (!externalUrl && signedUrl) externalUrl = signedUrl;
  }

  if (!storagePath && !externalUrl) {
    throw new Error("Ajoutez un fichier (max. 5 Mo) ou une URL.");
  }

  const { data, error } = await supabase
    .from("salon_documents")
    .insert({
      organization_id: organizationId,
      salon_id: salonId,
      category: input.category,
      doc_kind: docKind,
      title,
      description: input.description?.trim() ?? "",
      url: externalUrl,
      storage_path: storagePath,
      file_name: fileName,
      file_mime: fileMime,
      file_size_bytes: fileSizeBytes,
      amount_ht: amountHt,
      amount_ttc: amountTtc,
      due_date: input.dueDate ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    if (storagePath) await removeSalonDocumentFile(supabase, storagePath);
    throw error ?? new Error("Document impossible");
  }

  const document = mapDoc(data as DocRow, signedUrl);
  let budgetLine: SalonBudgetLine | null = null;

  const shouldBudget = input.createBudgetLine !== false && isCostDoc;
  if (shouldBudget) {
    const engaged = amountTtc && amountTtc > 0 ? amountTtc : amountHt ?? 0;
    budgetLine = await addBudgetLine(supabase, organizationId, salonId, {
      label: `${docKind === "facture" ? "Facture" : "Devis"} — ${title}`,
      category: input.category,
      amountHt: amountHt ?? engaged,
      amountTtc: amountTtc ?? engaged,
      dueDate: input.dueDate ?? null,
      paid: docKind === "facture" ? false : false,
      documentId: document.id,
    });
  }

  return { document, budgetLine };
}

export async function deleteDocument(supabase: SupabaseClient, id: string): Promise<void> {
  const { data, error: fetchErr } = await supabase
    .from("salon_documents")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  const storagePath = (data as { storage_path?: string | null } | null)?.storage_path ?? null;
  const { error } = await supabase.from("salon_documents").delete().eq("id", id);
  if (error) throw error;
  await removeSalonDocumentFile(supabase, storagePath);
}

export async function addContact(
  supabase: SupabaseClient,
  organizationId: string,
  salonId: string,
  label: string,
  value: string,
  sortOrder: number,
): Promise<SalonContact> {
  const { data, error } = await supabase
    .from("salon_contacts")
    .insert({
      organization_id: organizationId,
      salon_id: salonId,
      label: label.trim(),
      value: value.trim(),
      sort_order: sortOrder,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Contact impossible");
  return mapContact(data as ContactRow);
}

export async function addBudgetLine(
  supabase: SupabaseClient,
  organizationId: string,
  salonId: string,
  input: {
    label: string;
    category?: string;
    amountHt: number;
    amountTtc: number;
    dueDate?: string | null;
    paid?: boolean;
    documentId?: string | null;
  },
): Promise<SalonBudgetLine> {
  const { data, error } = await supabase
    .from("salon_budget_lines")
    .insert({
      organization_id: organizationId,
      salon_id: salonId,
      label: input.label.trim(),
      category: input.category ?? "autre",
      amount_ht: input.amountHt,
      amount_ttc: input.amountTtc,
      due_date: input.dueDate ?? null,
      paid: input.paid ?? false,
      document_id: input.documentId ?? null,
    })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Ligne budget impossible");
  return mapBudget(data as BudgetRow);
}

export async function updateBudgetLine(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<{ paid: boolean; amountHt: number; amountTtc: number; label: string }>,
): Promise<SalonBudgetLine> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.paid != null) row.paid = patch.paid;
  if (patch.amountHt != null) row.amount_ht = patch.amountHt;
  if (patch.amountTtc != null) row.amount_ttc = patch.amountTtc;
  if (patch.label != null) row.label = patch.label;
  const { data, error } = await supabase
    .from("salon_budget_lines")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Budget impossible");
  return mapBudget(data as BudgetRow);
}

export async function deleteBudgetLine(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("salon_budget_lines").delete().eq("id", id);
  if (error) throw error;
}

export async function seedSalons2026(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string | null,
  adminName?: string | null,
): Promise<number> {
  const existing = await fetchSalons(supabase, organizationId);
  const names = new Set(existing.map((s) => s.name.toLowerCase()));
  const today = new Date().toISOString().slice(0, 10);
  let created = 0;
  for (const seed of SALON_SEED_2026) {
    if (names.has(seed.name.toLowerCase())) continue;
    const past = seed.endDate < today;
    await createSalon(supabase, organizationId, userId, {
      name: seed.name,
      mode: seed.mode,
      location: seed.location,
      startDate: seed.startDate,
      endDate: seed.endDate,
      hall: seed.hall,
      standNumber: seed.standNumber,
      surfaceM2: seed.surfaceM2,
      notes: seed.notes,
      catalogSlug: seed.catalogSlug ?? matchCatalogFromName(seed.name)?.slug ?? null,
      adminName: adminName ?? null,
      // Salons déjà terminés : fiche OK, pas de checklist sur le board actif.
      syncToBoard: !past,
    });
    created += 1;
  }
  return created;
}

export function checklistProgress(items: SalonChecklistItem[]): number {
  if (!items.length) return 0;
  const done = items.filter((i) => i.done).length;
  return Math.round((done / items.length) * 100);
}

export function datesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}
