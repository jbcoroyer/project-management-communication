"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getSupabaseBrowser } from "./supabaseBrowser";
import { useCurrentUser } from "./currentUserContext";
import {
  SERVICE_COMMUNICATION_ORG_ID,
  allModulesEnabled,
  parseWorkspaceModules,
  type WorkspaceModules,
} from "./workspaceModules";

export type WorkspaceRole = "owner" | "admin" | "member";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
  /** null raw → tous les modules (Service Communication / legacy). */
  modules: WorkspaceModules;
  modulesConfigured: boolean;
  isServiceCommunication: boolean;
};

type WorkspaceContextValue = {
  workspaces: Workspace[];
  workspaceId: string | null;
  workspace: Workspace | null;
  role: WorkspaceRole | null;
  isWorkspaceAdmin: boolean;
  /** Owner/admin d’un espace perso pas encore configuré. */
  needsModulesOnboarding: boolean;
  modules: WorkspaceModules;
  loading: boolean;
  switchWorkspace: (id: string) => Promise<void>;
  createWorkspace: (name?: string) => Promise<string | null>;
  saveModules: (modules: WorkspaceModules) => Promise<void>;
  reload: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const STORAGE_KEY = "tuesday.activeWorkspaceId";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setWorkspaceId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      await supabase.rpc("ensure_user_workspace");

      const { data: memberships, error: memErr } = await supabase
        .from("organization_members")
        .select(
          "organization_id, role, organizations(id, name, slug, enabled_modules, modules_configured_at)",
        )
        .eq("user_id", user.id);
      if (memErr) throw memErr;

      type OrgShape = {
        id?: string;
        name?: string;
        slug?: string;
        enabled_modules?: unknown;
        modules_configured_at?: string | null;
      };
      type MembershipRow = {
        organization_id: string;
        role: string;
        organizations: OrgShape | OrgShape[] | null;
      };

      const list: Workspace[] = ((memberships ?? []) as MembershipRow[])
        .map((row) => {
          const org = row.organizations;
          const o = Array.isArray(org) ? org[0] : org;
          if (!o?.id || !o.name) return null;
          const role = (row.role as WorkspaceRole) || "member";
          const isServiceCommunication = String(o.id) === SERVICE_COMMUNICATION_ORG_ID;
          const configured =
            isServiceCommunication || Boolean(o.modules_configured_at);
          const modules = isServiceCommunication
            ? allModulesEnabled()
            : parseWorkspaceModules(o.enabled_modules, {
                treatNullAsAll: configured,
              }) ?? allModulesEnabled();

          return {
            id: String(o.id),
            name: String(o.name),
            slug: String(o.slug ?? ""),
            role,
            modules,
            modulesConfigured: configured,
            isServiceCommunication,
          } satisfies Workspace;
        })
        .filter((w): w is Workspace => Boolean(w));

      setWorkspaces(list);

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .maybeSingle();

      const stored =
        typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      const preferred =
        (profile?.organization_id as string | null) ||
        stored ||
        list[0]?.id ||
        null;

      const active =
        preferred && list.some((w) => w.id === preferred)
          ? preferred
          : (list[0]?.id ?? null);

      setWorkspaceId(active);
      if (active && typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, active);
      }
      if (active && profile?.organization_id !== active) {
        await supabase.rpc("switch_organization", { p_org_id: active });
      }
    } catch (err) {
      console.error("workspace reload failed", err);
      setWorkspaces([]);
      setWorkspaceId(null);
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const switchWorkspace = useCallback(
    async (id: string) => {
      if (!user || id === workspaceId) return;
      const { error } = await supabase.rpc("switch_organization", { p_org_id: id });
      if (error) throw error;
      setWorkspaceId(id);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, id);
      }
      window.location.reload();
    },
    [supabase, user, workspaceId],
  );

  const createWorkspace = useCallback(
    async (name?: string) => {
      const { data, error } = await supabase.rpc("create_personal_workspace", {
        p_name: name?.trim() || null,
      });
      if (error) throw error;
      const id = data as string | null;
      if (id && typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, id);
        window.location.href = "/onboarding";
      }
      return id ?? null;
    },
    [supabase],
  );

  const saveModules = useCallback(
    async (modules: WorkspaceModules) => {
      if (!workspaceId) throw new Error("Aucun espace actif");
      if (workspaceId === SERVICE_COMMUNICATION_ORG_ID) {
        throw new Error("Les modules du Service Communication ne sont pas modifiables");
      }
      const { error } = await supabase.rpc("save_workspace_modules", {
        p_org_id: workspaceId,
        p_modules: modules,
      });
      if (error) throw error;
      await reload();
    },
    [reload, supabase, workspaceId],
  );

  const workspace = workspaces.find((w) => w.id === workspaceId) ?? null;
  const role = workspace?.role ?? null;
  const isWorkspaceAdmin = role === "owner" || role === "admin";
  const needsModulesOnboarding = Boolean(
    workspace &&
      !workspace.isServiceCommunication &&
      !workspace.modulesConfigured &&
      isWorkspaceAdmin,
  );
  const modules = workspace?.modules ?? allModulesEnabled();

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaces,
      workspaceId,
      workspace,
      role,
      isWorkspaceAdmin,
      needsModulesOnboarding,
      modules,
      loading,
      switchWorkspace,
      createWorkspace,
      saveModules,
      reload,
    }),
    [
      workspaces,
      workspaceId,
      workspace,
      role,
      isWorkspaceAdmin,
      needsModulesOnboarding,
      modules,
      loading,
      switchWorkspace,
      createWorkspace,
      saveModules,
      reload,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace doit être utilisé sous WorkspaceProvider.");
  }
  return ctx;
}

/** Variante douce pour composants hors provider (ex. login). */
export function useWorkspaceOptional(): WorkspaceContextValue | null {
  return useContext(WorkspaceContext);
}
