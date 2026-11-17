"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2 } from "lucide-react";
import { getSupabaseBrowser } from "../../lib/supabaseBrowser";
import { useWorkspace } from "../../lib/useWorkspace";
import { useServices } from "../../lib/servicesContext";
import { toastError, toastSuccess } from "../../lib/toast";
import type { ServiceRole } from "../../lib/services";

type OrgMember = {
  userId: string;
  displayName: string;
};

type MembershipMap = Record<string, Record<string, ServiceRole | null>>;

export default function WorkspaceServicesPanel() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const { workspaceId, workspace, isWorkspaceAdmin } = useWorkspace();
  const { services, reload, setServiceMember } = useServices();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [matrix, setMatrix] = useState<MembershipMap>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workspaceId) return;

    const { data: mems } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", workspaceId);

    const userIds = ((mems ?? []) as { user_id: string }[]).map((m) => String(m.user_id));
    type ProfileName = { id: string; display_name: string | null };
    const { data: profilesRaw } =
      userIds.length > 0
        ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
        : { data: [] as ProfileName[] };
    const profiles = (profilesRaw ?? []) as ProfileName[];
    const nameById = new Map(profiles.map((p) => [String(p.id), p.display_name ?? null]));

    setMembers(
      userIds.map((id) => ({
        userId: id,
        displayName: nameById.get(id)?.trim() || id.slice(0, 8),
      })),
    );

    const serviceIds = services.map((s) => s.id);
    if (serviceIds.length === 0) {
      setMatrix({});
      return;
    }

    const { data: sm } = await supabase
      .from("service_members")
      .select("service_id, user_id, role")
      .in("service_id", serviceIds);

    const next: MembershipMap = {};
    for (const s of services) {
      next[s.id] = {};
      for (const u of userIds) next[s.id][u] = null;
    }
    for (const row of (sm ?? []) as { service_id: string; user_id: string; role: string }[]) {
      const sid = String(row.service_id);
      const uid = String(row.user_id);
      if (!next[sid]) next[sid] = {};
      next[sid][uid] = row.role === "lead" ? "lead" : "member";
    }
    setMatrix(next);
  }, [services, supabase, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (serviceId: string, userId: string, enabled: boolean) => {
    const key = `${serviceId}:${userId}`;
    setBusyKey(key);
    try {
      await setServiceMember({
        serviceId,
        userId,
        role: matrix[serviceId]?.[userId] === "lead" ? "lead" : "member",
        enabled,
      });
      toastSuccess(enabled ? "Rattaché au service" : "Retiré du service");
      await load();
      await reload();
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyKey(null);
    }
  };

  if (!workspace) return null;

  return (
    <section className="ui-surface space-y-4 rounded-2xl p-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
          Services
        </p>
        <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
          <Building2 className="h-5 w-5 text-[var(--accent)]" aria-hidden />
          Services de l’espace — {workspace.name}
        </h2>
        <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
          Un seul espace partagé : rattachez chaque personne aux services qu’elle
          utilise (ADV, Export, R&amp;D, Communication…). La navigation se filtre
          ensuite selon le service actif.
        </p>
      </header>

      {services.length === 0 ? (
        <p className="text-sm text-[color:var(--foreground)]/50">
          Aucun service configuré pour cet espace.
        </p>
      ) : (
        <div className="space-y-4">
          {services.map((service) => (
            <div
              key={service.id}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)]/40 p-3.5"
            >
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: service.color || "var(--accent)" }}
                  aria-hidden
                />
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  {service.name}
                </h3>
              </div>
              {!isWorkspaceAdmin ? (
                <p className="text-xs text-[color:var(--foreground)]/50">
                  Seuls les admins peuvent modifier les rattachements.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {members.map((m) => {
                    const role = matrix[service.id]?.[m.userId] ?? null;
                    const checked = role != null;
                    const key = `${service.id}:${m.userId}`;
                    return (
                      <li key={m.userId}>
                        <label className="ui-transition flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-[var(--surface)]">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={busyKey === key}
                            onChange={(e) =>
                              void toggle(service.id, m.userId, e.target.checked)
                            }
                            className="h-4 w-4 rounded border-[var(--line)] accent-[var(--accent)]"
                          />
                          <span className="min-w-0 flex-1 truncate text-sm text-[var(--foreground)]">
                            {m.displayName}
                          </span>
                          {checked ? (
                            <span className="text-[10px] uppercase tracking-wide text-[color:var(--foreground)]/40">
                              {role}
                            </span>
                          ) : null}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
