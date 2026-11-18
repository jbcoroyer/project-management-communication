"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "./supabaseBrowser";
import { useWorkspace } from "./workspaceContext";
import { useCurrentUser } from "./useCurrentUser";
import { toastError, toastSuccess } from "./toast";
import type {
  Salon,
  SalonBudgetLine,
  SalonChecklistItem,
  SalonContact,
  SalonDocument,
} from "./salonTypes";
import {
  addBudgetLine,
  addChecklistItem,
  addContact,
  addDocument,
  cloneSalon,
  createSalon,
  deleteBudgetLine,
  deleteDocument,
  deleteSalon,
  fetchBudgetLines,
  fetchChecklist,
  fetchContacts,
  fetchDocuments,
  fetchSalons,
  updateBudgetLine,
  updateChecklistItem,
  updateSalon,
  type CreateSalonInput,
} from "./salonData";
export function useSalons() {
  const supabase = getSupabaseBrowser();
  const { workspaceId } = useWorkspace();
  const { user } = useCurrentUser();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [checklist, setChecklist] = useState<SalonChecklistItem[]>([]);
  const [budgetLines, setBudgetLines] = useState<SalonBudgetLine[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!workspaceId) {
      setSalons([]);
      setChecklist([]);
      setBudgetLines([]);
      setLoading(false);
      return;
    }
    try {
      const [s, c, b] = await Promise.all([
        fetchSalons(supabase, workspaceId),
        fetchChecklist(supabase, workspaceId),
        fetchBudgetLines(supabase, workspaceId),
      ]);
      setSalons(s);
      setChecklist(c);
      setBudgetLines(b);
    } catch (err) {
      console.error(err);
      toastError("Chargement salons impossible", { id: "salons-load" });
      setSalons([]);
      setChecklist([]);
      setBudgetLines([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, workspaceId]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  const adminName = user?.teamMemberName ?? user?.displayName ?? user?.email ?? "";

  const addSalon = useCallback(
    async (input: CreateSalonInput) => {
      if (!workspaceId) return null;
      try {
        const created = await createSalon(supabase, workspaceId, user?.id ?? null, {
          ...input,
          adminName: input.adminName ?? adminName,
        });
        await reload();
        toastSuccess("Salon créé — checklist poussée au tableau");
        return created;
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Création impossible");
        return null;
      }
    },
    [adminName, reload, supabase, user?.id, workspaceId],
  );

  const patchSalon = useCallback(
    async (id: string, patch: Parameters<typeof updateSalon>[2]) => {
      try {
        const updated = await updateSalon(supabase, id, patch);
        setSalons((prev) => prev.map((s) => (s.id === id ? updated : s)));
        toastSuccess("Salon mis à jour");
        return updated;
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Mise à jour impossible");
        return null;
      }
    },
    [supabase],
  );

  const removeSalon = useCallback(
    async (id: string) => {
      try {
        await deleteSalon(supabase, id);
        await reload();
        toastSuccess("Salon supprimé");
        return true;
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Suppression impossible");
        return false;
      }
    },
    [reload, supabase],
  );

  const duplicateSalon = useCallback(
    async (source: Salon, input: { name: string; startDate: string; endDate: string }) => {
      if (!workspaceId) return null;
      try {
        const created = await cloneSalon(
          supabase,
          workspaceId,
          user?.id ?? null,
          source,
          input,
        );
        await reload();
        toastSuccess("Salon cloné");
        return created;
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Clonage impossible");
        return null;
      }
    },
    [reload, supabase, user?.id, workspaceId],
  );

  const toggleChecklist = useCallback(
    async (id: string, done: boolean) => {
      try {
        const updated = await updateChecklistItem(supabase, id, { done });
        setChecklist((prev) => prev.map((c) => (c.id === id ? updated : c)));
        return updated;
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Checklist impossible");
        return null;
      }
    },
    [supabase],
  );

  return {
    salons,
    checklist,
    budgetLines,
    loading,
    reload,
    addSalon,
    patchSalon,
    removeSalon,
    duplicateSalon,
    toggleChecklist,
    workspaceId,
    userId: user?.id ?? null,
    supabase,
  };
}

export function useSalonDetail(salonId: string | null) {
  const supabase = getSupabaseBrowser();
  const { workspaceId } = useWorkspace();
  const { user } = useCurrentUser();
  const adminName = user?.teamMemberName ?? user?.displayName ?? user?.email ?? "";
  const [salon, setSalon] = useState<Salon | null>(null);
  const [checklist, setChecklist] = useState<SalonChecklistItem[]>([]);
  const [documents, setDocuments] = useState<SalonDocument[]>([]);
  const [contacts, setContacts] = useState<SalonContact[]>([]);
  const [budgetLines, setBudgetLines] = useState<SalonBudgetLine[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!workspaceId || !salonId) {
      setSalon(null);
      setChecklist([]);
      setDocuments([]);
      setContacts([]);
      setBudgetLines([]);
      setLoading(false);
      return;
    }
    try {
      const [sList, c, d, k, b] = await Promise.all([
        fetchSalons(supabase, workspaceId),
        fetchChecklist(supabase, workspaceId, salonId),
        fetchDocuments(supabase, workspaceId, salonId),
        fetchContacts(supabase, workspaceId, salonId),
        fetchBudgetLines(supabase, workspaceId, salonId),
      ]);
      setSalon(sList.find((x) => x.id === salonId) ?? null);
      setChecklist(c);
      setDocuments(d);
      setContacts(k);
      setBudgetLines(b);
    } catch (err) {
      console.error(err);
      toastError("Chargement fiche salon impossible", { id: "salon-detail-load" });
    } finally {
      setLoading(false);
    }
  }, [salonId, supabase, workspaceId]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  const patchChecklist = useCallback(
    async (id: string, patch: Parameters<typeof updateChecklistItem>[2]) => {
      const updated = await updateChecklistItem(supabase, id, patch);
      setChecklist((prev) => prev.map((c) => (c.id === id ? updated : c)));
      return updated;
    },
    [supabase],
  );

  const createChecklist = useCallback(
    async (label: string, dueDate: string | null) => {
      if (!workspaceId || !salonId || !salon) return null;
      const item = await addChecklistItem(
        supabase,
        workspaceId,
        salonId,
        label,
        dueDate,
        checklist.length,
        { salonName: salon.name, mode: salon.mode, adminName },
      );
      setChecklist((prev) => [...prev, item]);
      return item;
    },
    [adminName, checklist.length, salon, salonId, supabase, workspaceId],
  );

  const createDoc = useCallback(
    async (input: Parameters<typeof addDocument>[3]) => {
      if (!workspaceId || !salonId) return null;
      const doc = await addDocument(supabase, workspaceId, salonId, input);
      setDocuments((prev) => [doc, ...prev]);
      return doc;
    },
    [salonId, supabase, workspaceId],
  );

  const removeDoc = useCallback(
    async (id: string) => {
      await deleteDocument(supabase, id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    },
    [supabase],
  );

  const createContact = useCallback(
    async (label: string, value: string) => {
      if (!workspaceId || !salonId) return null;
      const c = await addContact(supabase, workspaceId, salonId, label, value, contacts.length);
      setContacts((prev) => [...prev, c]);
      return c;
    },
    [contacts.length, salonId, supabase, workspaceId],
  );

  const createBudget = useCallback(
    async (input: Parameters<typeof addBudgetLine>[3]) => {
      if (!workspaceId || !salonId) return null;
      const line = await addBudgetLine(supabase, workspaceId, salonId, input);
      setBudgetLines((prev) => [...prev, line]);
      return line;
    },
    [salonId, supabase, workspaceId],
  );

  const patchBudget = useCallback(
    async (id: string, patch: Parameters<typeof updateBudgetLine>[2]) => {
      const line = await updateBudgetLine(supabase, id, patch);
      setBudgetLines((prev) => prev.map((b) => (b.id === id ? line : b)));
      return line;
    },
    [supabase],
  );

  const removeBudget = useCallback(
    async (id: string) => {
      await deleteBudgetLine(supabase, id);
      setBudgetLines((prev) => prev.filter((b) => b.id !== id));
    },
    [supabase],
  );

  const patchSalon = useCallback(
    async (patch: Parameters<typeof updateSalon>[2]) => {
      if (!salonId) return null;
      const updated = await updateSalon(supabase, salonId, patch);
      setSalon(updated);
      return updated;
    },
    [salonId, supabase],
  );

  return {
    salon,
    checklist,
    documents,
    contacts,
    budgetLines,
    loading,
    reload,
    patchSalon,
    patchChecklist,
    createChecklist,
    createDoc,
    removeDoc,
    createContact,
    createBudget,
    patchBudget,
    removeBudget,
  };
}
