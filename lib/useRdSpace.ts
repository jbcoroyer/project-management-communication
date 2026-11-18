"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "./supabaseBrowser";
import { useWorkspace } from "./workspaceContext";
import { useCurrentUser } from "./useCurrentUser";
import { toastError, toastSuccess } from "./toast";
import type { RdExperience, RdGate, RdGateDecision, RdProject } from "./rdTypes";
import {
  createRdExperience,
  createRdGate,
  createRdProject,
  decideRdGate,
  fetchRdExperiences,
  fetchRdGates,
  fetchRdProjects,
  updateRdExperience,
  updateRdGate,
  updateRdProject,
  type CreateRdExperienceInput,
  type CreateRdGateInput,
  type CreateRdProjectInput,
} from "./rdData";

export function useRdSpace() {
  const supabase = getSupabaseBrowser();
  const { workspaceId } = useWorkspace();
  const { user } = useCurrentUser();
  const [projects, setProjects] = useState<RdProject[]>([]);
  const [experiences, setExperiences] = useState<RdExperience[]>([]);
  const [gates, setGates] = useState<RdGate[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!workspaceId) {
      setProjects([]);
      setExperiences([]);
      setGates([]);
      setLoading(false);
      return;
    }
    try {
      const [p, e, g] = await Promise.all([
        fetchRdProjects(supabase, workspaceId),
        fetchRdExperiences(supabase, workspaceId),
        fetchRdGates(supabase, workspaceId),
      ]);
      setProjects(p);
      setExperiences(e);
      setGates(g);
    } catch (err) {
      console.error(err);
      // Message stable + id Sonner : évite 3 toasts identiques (Strict Mode / multi-mount).
      toastError("Chargement R&D impossible", { id: "rd-space-load" });
      setProjects([]);
      setExperiences([]);
      setGates([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, workspaceId]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  const addProject = useCallback(
    async (input: CreateRdProjectInput) => {
      if (!workspaceId) return null;
      try {
        const created = await createRdProject(supabase, workspaceId, user?.id ?? null, input);
        setProjects((prev) => [created, ...prev]);
        toastSuccess("Projet R&D créé");
        return created;
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Création impossible");
        return null;
      }
    },
    [supabase, user?.id, workspaceId],
  );

  const patchProject = useCallback(
    async (id: string, patch: Parameters<typeof updateRdProject>[2]) => {
      try {
        const updated = await updateRdProject(supabase, id, patch);
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

  const addExperience = useCallback(
    async (input: CreateRdExperienceInput) => {
      if (!workspaceId) return null;
      try {
        const created = await createRdExperience(supabase, workspaceId, user?.id ?? null, input);
        setExperiences((prev) => [created, ...prev]);
        toastSuccess("Expérience créée");
        return created;
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Création impossible");
        return null;
      }
    },
    [supabase, user?.id, workspaceId],
  );

  const patchExperience = useCallback(
    async (id: string, patch: Parameters<typeof updateRdExperience>[2]) => {
      try {
        const updated = await updateRdExperience(supabase, id, patch);
        setExperiences((prev) => prev.map((e) => (e.id === id ? updated : e)));
        toastSuccess("Expérience mise à jour");
        return updated;
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Mise à jour impossible");
        return null;
      }
    },
    [supabase],
  );

  const addGate = useCallback(
    async (input: CreateRdGateInput) => {
      if (!workspaceId) return null;
      try {
        const created = await createRdGate(supabase, workspaceId, user?.id ?? null, input);
        setGates((prev) => [created, ...prev]);
        toastSuccess("Gate planifiée");
        return created;
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Création impossible");
        return null;
      }
    },
    [supabase, user?.id, workspaceId],
  );

  const patchGate = useCallback(
    async (id: string, patch: Parameters<typeof updateRdGate>[2]) => {
      try {
        const updated = await updateRdGate(supabase, id, patch);
        setGates((prev) => prev.map((g) => (g.id === id ? updated : g)));
        toastSuccess("Gate mise à jour");
        return updated;
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Mise à jour impossible");
        return null;
      }
    },
    [supabase],
  );

  const applyGateDecision = useCallback(
    async (gate: RdGate, decision: RdGateDecision, minutes?: string) => {
      try {
        const result = await decideRdGate(supabase, gate, decision, minutes);
        setGates((prev) => prev.map((g) => (g.id === gate.id ? result.gate : g)));
        if (result.project) {
          setProjects((prev) =>
            prev.map((p) => (p.id === result.project!.id ? result.project! : p)),
          );
        }
        toastSuccess(`Décision ${decision.replace("_", "-")} enregistrée`);
        return result;
      } catch (err) {
        toastError(err instanceof Error ? err.message : "Décision impossible");
        return null;
      }
    },
    [supabase],
  );

  return {
    projects,
    experiences,
    gates,
    loading,
    reload,
    addProject,
    patchProject,
    addExperience,
    patchExperience,
    addGate,
    patchGate,
    applyGateDecision,
  };
}
