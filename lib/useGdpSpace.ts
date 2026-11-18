"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "./supabaseBrowser";
import { useWorkspace } from "./workspaceContext";
import { useCurrentUser } from "./useCurrentUser";
import { toastError, toastSuccess } from "./toast";
import type { GdpDecision, GdpMilestone, GdpProject, GdpRisk } from "./gdpTypes";
import {
  createGdpDecision,
  createGdpMilestone,
  createGdpProject,
  createGdpRisk,
  fetchGdpDecisions,
  fetchGdpMilestones,
  fetchGdpProjects,
  fetchGdpRisks,
  updateGdpMilestone,
  updateGdpProject,
  updateGdpRisk,
  type CreateGdpDecisionInput,
  type CreateGdpMilestoneInput,
  type CreateGdpProjectInput,
  type CreateGdpRiskInput,
} from "./gdpData";

export function useGdpSpace() {
  const supabase = getSupabaseBrowser();
  const { workspaceId } = useWorkspace();
  const { user } = useCurrentUser();
  const [projects, setProjects] = useState<GdpProject[]>([]);
  const [milestones, setMilestones] = useState<GdpMilestone[]>([]);
  const [risks, setRisks] = useState<GdpRisk[]>([]);
  const [decisions, setDecisions] = useState<GdpDecision[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!workspaceId) {
      setProjects([]);
      setMilestones([]);
      setRisks([]);
      setDecisions([]);
      setLoading(false);
      return;
    }
    try {
      const [p, m, r, d] = await Promise.all([
        fetchGdpProjects(supabase, workspaceId),
        fetchGdpMilestones(supabase, workspaceId),
        fetchGdpRisks(supabase, workspaceId),
        fetchGdpDecisions(supabase, workspaceId),
      ]);
      setProjects(p);
      setMilestones(m);
      setRisks(r);
      setDecisions(d);
    } catch (err) {
      console.error(err);
      // Message stable + id Sonner : évite le spam de toasts identiques.
      toastError("Chargement GdP impossible", { id: "gdp-space-load" });
      setProjects([]);
      setMilestones([]);
      setRisks([]);
      setDecisions([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, workspaceId]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  const addProject = useCallback(
    async (input: CreateGdpProjectInput) => {
      if (!workspaceId) return null;
      try {
        const created = await createGdpProject(supabase, workspaceId, user?.id ?? null, input);
        setProjects((prev) => [created, ...prev]);
        toastSuccess("Projet créé");
        return created;
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Création impossible");
        return null;
      }
    },
    [supabase, user?.id, workspaceId],
  );

  const patchProject = useCallback(
    async (id: string, patch: Parameters<typeof updateGdpProject>[2]) => {
      try {
        const updated = await updateGdpProject(supabase, id, patch);
        setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
        toastSuccess("Projet mis à jour");
        return updated;
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Mise à jour impossible");
        return null;
      }
    },
    [supabase],
  );

  const addMilestone = useCallback(
    async (input: CreateGdpMilestoneInput) => {
      if (!workspaceId) return null;
      try {
        const created = await createGdpMilestone(supabase, workspaceId, user?.id ?? null, input);
        setMilestones((prev) => [created, ...prev]);
        toastSuccess("Jalon créé");
        return created;
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Création impossible");
        return null;
      }
    },
    [supabase, user?.id, workspaceId],
  );

  const patchMilestone = useCallback(
    async (id: string, patch: Parameters<typeof updateGdpMilestone>[2]) => {
      try {
        const updated = await updateGdpMilestone(supabase, id, patch);
        setMilestones((prev) => prev.map((m) => (m.id === id ? updated : m)));
        toastSuccess("Jalon mis à jour");
        return updated;
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Mise à jour impossible");
        return null;
      }
    },
    [supabase],
  );

  const addRisk = useCallback(
    async (input: CreateGdpRiskInput) => {
      if (!workspaceId) return null;
      try {
        const created = await createGdpRisk(supabase, workspaceId, user?.id ?? null, input);
        setRisks((prev) => [created, ...prev]);
        toastSuccess("Risque enregistré");
        return created;
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Création impossible");
        return null;
      }
    },
    [supabase, user?.id, workspaceId],
  );

  const patchRisk = useCallback(
    async (id: string, patch: Parameters<typeof updateGdpRisk>[2]) => {
      try {
        const updated = await updateGdpRisk(supabase, id, patch);
        setRisks((prev) => prev.map((r) => (r.id === id ? updated : r)));
        toastSuccess("Risque mis à jour");
        return updated;
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Mise à jour impossible");
        return null;
      }
    },
    [supabase],
  );

  const addDecision = useCallback(
    async (input: CreateGdpDecisionInput) => {
      if (!workspaceId) return null;
      try {
        const created = await createGdpDecision(supabase, workspaceId, user?.id ?? null, input);
        setDecisions((prev) => [created, ...prev]);
        toastSuccess("Décision enregistrée");
        return created;
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Création impossible");
        return null;
      }
    },
    [supabase, user?.id, workspaceId],
  );

  return {
    projects,
    milestones,
    risks,
    decisions,
    loading,
    reload,
    addProject,
    patchProject,
    addMilestone,
    patchMilestone,
    addRisk,
    patchRisk,
    addDecision,
  };
}
