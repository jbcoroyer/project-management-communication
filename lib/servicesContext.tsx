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
import { useWorkspaceOptional } from "./workspaceContext";
import { parseOrgLabels, type OrgLabels } from "./orgLabels";
import {
  readStoredActiveServiceId,
  writeStoredActiveServiceId,
  type OrgService,
  type ServiceMembership,
  type ServiceRole,
} from "./services";

type ServicesContextValue = {
  services: OrgService[];
  myMemberships: ServiceMembership[];
  /** Services auxquels l’utilisateur appartient (ou tous si admin org). */
  myServices: OrgService[];
  /** null = tous mes services. */
  activeServiceId: string | null;
  activeService: OrgService | null;
  orgLabels: OrgLabels;
  loading: boolean;
  setActiveServiceId: (id: string | null) => void;
  reload: () => Promise<void>;
  saveOrgLabels: (labels: OrgLabels) => Promise<void>;
  setServiceMember: (args: {
    serviceId: string;
    userId: string;
    role?: ServiceRole;
    enabled: boolean;
  }) => Promise<void>;
};

const ServicesContext = createContext<ServicesContextValue | null>(null);

type ServiceRow = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  sort_order: number;
  is_active: boolean;
};

type MembershipRow = {
  service_id: string;
  role: string;
};

export function ServicesProvider({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const workspace = useWorkspaceOptional();
  const workspaceId = workspace?.workspaceId ?? null;
  const isWorkspaceAdmin = workspace?.isWorkspaceAdmin ?? false;
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const [services, setServices] = useState<OrgService[]>([]);
  const [myMemberships, setMyMemberships] = useState<ServiceMembership[]>([]);
  const [orgLabels, setOrgLabels] = useState<OrgLabels>({});
  const [activeServiceId, setActiveServiceIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!user || !workspaceId) {
      setServices([]);
      setMyMemberships([]);
      setOrgLabels({});
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [svcRes, orgRes] = await Promise.all([
        supabase
          .from("services")
          .select("id, name, slug, color, sort_order, is_active")
          .eq("organization_id", workspaceId)
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("organizations")
          .select("org_labels")
          .eq("id", workspaceId)
          .maybeSingle(),
      ]);

      if (svcRes.error) throw svcRes.error;

      const list: OrgService[] = ((svcRes.data ?? []) as ServiceRow[]).map((row) => ({
        id: String(row.id),
        name: String(row.name),
        slug: String(row.slug),
        color: row.color ?? null,
        sortOrder: Number(row.sort_order) || 0,
        isActive: row.is_active !== false,
      }));
      setServices(list);
      setOrgLabels(parseOrgLabels(orgRes.data?.org_labels));

      const serviceIds = list.map((s) => s.id);
      if (serviceIds.length === 0) {
        setMyMemberships([]);
      } else {
        const { data: mems, error: memErr } = await supabase
          .from("service_members")
          .select("service_id, role")
          .eq("user_id", user.id)
          .in("service_id", serviceIds);
        if (memErr) throw memErr;
        setMyMemberships(
          ((mems ?? []) as MembershipRow[]).map((m) => ({
            serviceId: String(m.service_id),
            role: (m.role === "lead" ? "lead" : "member") as ServiceRole,
          })),
        );
      }

      const stored = readStoredActiveServiceId();
      setActiveServiceIdState(
        stored && list.some((s) => s.id === stored) ? stored : null,
      );
    } catch (err) {
      console.error("services reload failed", err);
      setServices([]);
      setMyMemberships([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, user, workspaceId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setActiveServiceId = useCallback((id: string | null) => {
    setActiveServiceIdState(id);
    writeStoredActiveServiceId(id);
  }, []);

  const saveOrgLabels = useCallback(
    async (labels: OrgLabels) => {
      if (!workspaceId) throw new Error("Aucun espace actif");
      const { error } = await supabase.rpc("save_org_labels", {
        p_org_id: workspaceId,
        p_labels: labels,
      });
      if (error) throw error;
      await reload();
    },
    [reload, supabase, workspaceId],
  );

  const setServiceMember = useCallback(
    async (args: {
      serviceId: string;
      userId: string;
      role?: ServiceRole;
      enabled: boolean;
    }) => {
      const { error } = await supabase.rpc("set_service_member", {
        p_service_id: args.serviceId,
        p_user_id: args.userId,
        p_role: args.role ?? "member",
        p_enabled: args.enabled,
      });
      if (error) throw error;
      await reload();
    },
    [reload, supabase],
  );

  const myServices = useMemo(() => {
    if (isWorkspaceAdmin) return services;
    const allowed = new Set(myMemberships.map((m) => m.serviceId));
    return services.filter((s) => allowed.has(s.id));
  }, [isWorkspaceAdmin, myMemberships, services]);

  const activeService =
    activeServiceId == null
      ? null
      : (services.find((s) => s.id === activeServiceId) ?? null);

  const value = useMemo<ServicesContextValue>(
    () => ({
      services,
      myMemberships,
      myServices,
      activeServiceId,
      activeService,
      orgLabels,
      loading,
      setActiveServiceId,
      reload,
      saveOrgLabels,
      setServiceMember,
    }),
    [
      services,
      myMemberships,
      myServices,
      activeServiceId,
      activeService,
      orgLabels,
      loading,
      setActiveServiceId,
      reload,
      saveOrgLabels,
      setServiceMember,
    ],
  );

  return (
    <ServicesContext.Provider value={value}>{children}</ServicesContext.Provider>
  );
}

export function useServices(): ServicesContextValue {
  const ctx = useContext(ServicesContext);
  if (!ctx) {
    throw new Error("useServices doit être utilisé sous ServicesProvider.");
  }
  return ctx;
}

export function useServicesOptional(): ServicesContextValue | null {
  return useContext(ServicesContext);
}
