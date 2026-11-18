"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Search } from "lucide-react";
import { getSupabaseBrowser } from "../../lib/supabaseBrowser";
import { useWorkspace } from "../../lib/useWorkspace";
import { useServices } from "../../lib/servicesContext";
import { toastError, toastSuccess } from "../../lib/toast";
import type { ServiceRole } from "../../lib/services";

type OrgMember = {
  userId: string;
  displayName: string;
};

/** serviceId → userId → role | null */
type MembershipMap = Record<string, Record<string, ServiceRole | null>>;

export default function WorkspaceServicesPanel() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const { workspaceId, workspace, isWorkspaceAdmin } = useWorkspace();
  const { services, reload, setServiceMember } = useServices();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [matrix, setMatrix] = useState<MembershipMap>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");

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

    const nextMembers = userIds
      .map((id) => ({
        userId: id,
        displayName: nameById.get(id)?.trim() || id.slice(0, 8),
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "fr"));
    setMembers(nextMembers);

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

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.displayName.toLowerCase().includes(q));
  }, [members, query]);

  const toggle = async (serviceId: string, userId: string, enabled: boolean) => {
    const key = `${userId}:${serviceId}`;
    setBusyKey(key);
    try {
      await setServiceMember({
        serviceId,
        userId,
        role: matrix[serviceId]?.[userId] === "lead" ? "lead" : "member",
        enabled,
      });
      toastSuccess(enabled ? "Service ajouté" : "Service retiré");
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
          Rattachements
        </p>
        <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
          <Building2 className="h-5 w-5 text-[var(--accent)]" aria-hidden />
          Services par personne — {workspace.name}
        </h2>
        <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
          Une ligne par membre : cochez les services auxquels il appartient
          (ex. Communication). Les services inactifs n’apparaissent plus ici.
        </p>
      </header>

      {services.length === 0 ? (
        <p className="text-sm text-[color:var(--foreground)]/50">
          Aucun service configuré pour cet espace.
        </p>
      ) : members.length === 0 ? (
        <p className="text-sm text-[color:var(--foreground)]/50">
          Aucun membre dans l’espace. Ajoutez-en dans Équipe.
        </p>
      ) : (
        <div className="space-y-3">
          <label className="relative block max-w-sm">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--foreground)]/40"
              aria-hidden
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrer une personne…"
              className="ui-focus-ring w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[color:var(--foreground)]/40"
            />
          </label>

          {!isWorkspaceAdmin ? (
            <p className="text-xs text-[color:var(--foreground)]/50">
              Seuls les admins peuvent modifier les rattachements.
            </p>
          ) : null}

          <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-xl border border-[var(--line)]">
            {filteredMembers.map((m) => {
              const linked = services.filter((s) => matrix[s.id]?.[m.userId] != null);
              return (
                <li
                  key={m.userId}
                  className="flex flex-col gap-2.5 bg-[var(--surface)] px-3.5 py-3 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="min-w-0 sm:w-44 sm:shrink-0">
                    <p className="truncate text-sm font-semibold text-[var(--foreground)]">
                      {m.displayName}
                    </p>
                    <p className="text-[11px] text-[color:var(--foreground)]/45">
                      {linked.length === 0
                        ? "Aucun service"
                        : linked.length === 1
                          ? "1 service"
                          : `${linked.length} services`}
                    </p>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                    {services.map((service) => {
                      const role = matrix[service.id]?.[m.userId] ?? null;
                      const on = role != null;
                      const key = `${m.userId}:${service.id}`;
                      const label = service.name;
                      const color = service.color || "var(--accent)";
                      return (
                        <button
                          key={service.id}
                          type="button"
                          disabled={!isWorkspaceAdmin || busyKey === key}
                          aria-pressed={on}
                          title={
                            on
                              ? `Retirer ${m.displayName} de ${label}`
                              : `Rattacher ${m.displayName} à ${label}`
                          }
                          onClick={() => void toggle(service.id, m.userId, !on)}
                          className={[
                            "ui-transition inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12px] font-semibold disabled:cursor-not-allowed disabled:opacity-50",
                            on
                              ? "border-transparent text-[var(--accent-contrast)]"
                              : "border-[var(--line)] bg-[var(--surface-soft)]/60 text-[color:var(--foreground)]/65 hover:border-[var(--line-strong)] hover:text-[var(--foreground)]",
                          ].join(" ")}
                          style={
                            on
                              ? {
                                  background: color,
                                  boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 70%, black)`,
                                }
                              : undefined
                          }
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              background: on ? "var(--accent-contrast)" : color,
                            }}
                            aria-hidden
                          />
                          {label}
                          {on && role === "lead" ? (
                            <span className="text-[10px] font-medium opacity-80">lead</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>

          {filteredMembers.length === 0 ? (
            <p className="text-sm text-[color:var(--foreground)]/50">
              Aucune personne ne correspond à « {query.trim()} ».
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
