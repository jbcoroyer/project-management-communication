"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "./supabaseBrowser";
import {
  createDeliverable,
  deleteDeliverable,
  mapDeliverableRowsWithSignedUrls,
  updateDeliverable,
  type CreateDeliverableInput,
  type Deliverable,
  type UpdateDeliverableInput,
} from "./deliverables";
import { toastError, toastSuccess } from "./toast";
import { useWorkspace } from "./workspaceContext";

export function useDeliverables() {
  const supabase = getSupabaseBrowser();
  const { workspaceId } = useWorkspace();
  const [items, setItems] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!workspaceId) {
      setItems([]);
      setLoading(false);
      return;
    }
    // loading silencieux après le 1er fetch (état initial = true)
    const { data, error } = await supabase
      .from("deliverables")
      .select("*")
      .eq("organization_id", workspaceId)
      .order("completed_at", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      toastError(`Livrables indisponibles : ${error.message}`);
      setItems([]);
    } else {
      setItems(await mapDeliverableRowsWithSignedUrls(supabase, data ?? []));
    }
    setLoading(false);
  }, [supabase, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = useCallback(
    async (input: CreateDeliverableInput) => {
      const result = await createDeliverable(supabase, input);
      if ("error" in result) {
        toastError(result.error);
        return null;
      }
      setItems((prev) => {
        const withoutDup = prev.filter(
          (d) =>
            d.id !== result.deliverable.id &&
            !(result.deliverable.taskId && d.taskId === result.deliverable.taskId),
        );
        return [result.deliverable, ...withoutDup];
      });
      toastSuccess("Livrable enregistré");
      return result.deliverable;
    },
    [supabase],
  );

  const update = useCallback(
    async (item: Deliverable, input: UpdateDeliverableInput) => {
      const result = await updateDeliverable(supabase, item, input);
      if ("error" in result) {
        toastError(result.error);
        return null;
      }
      setItems((prev) =>
        prev.map((d) => (d.id === result.deliverable.id ? result.deliverable : d)),
      );
      toastSuccess("Livrable mis à jour");
      return result.deliverable;
    },
    [supabase],
  );

  const remove = useCallback(
    async (item: Deliverable) => {
      const { error } = await deleteDeliverable(supabase, item);
      if (error) {
        toastError(error);
        return false;
      }
      setItems((prev) => prev.filter((d) => d.id !== item.id));
      toastSuccess("Livrable supprimé");
      return true;
    },
    [supabase],
  );

  return { items, loading, reload: load, add, update, remove };
}
