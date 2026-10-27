"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, UserPlus } from "lucide-react";
import { getSupabaseBrowser } from "../../lib/supabaseBrowser";
import { useWorkspace } from "../../lib/useWorkspace";
import { toastError, toastSuccess } from "../../lib/toast";
import { getPublicAppOrigin } from "../../lib/publicAppUrl";

type MemberRow = {
  user_id: string;
  role: string;
  display_name: string | null;
};

type InviteRow = {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
};

type AddResult = {
  status?: "added" | "invited";
  token?: string;
  email?: string;
};

export default function WorkspaceMembersPanel() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const { workspaceId, workspace, isWorkspaceAdmin } = useWorkspace();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!workspaceId) return;
    const { data: mems } = await supabase
      .from("organization_members")
      .select("user_id, role")
      .eq("organization_id", workspaceId);

    const memberRows = (mems ?? []) as { user_id: string; role: string }[];
    const userIds = memberRows.map((m) => String(m.user_id));
    type ProfileName = { id: string; display_name: string | null };
    const { data: profilesRaw } =
      userIds.length > 0
        ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
        : { data: [] as ProfileName[] };
    const profiles = (profilesRaw ?? []) as ProfileName[];
    const nameById = new Map(
      profiles.map((p) => [String(p.id), p.display_name ?? null]),
    );

    setMembers(
      memberRows.map((m) => ({
        user_id: String(m.user_id),
        role: String(m.role),
        display_name: nameById.get(String(m.user_id)) ?? null,
      })),
    );

    if (isWorkspaceAdmin) {
      const { data: inv } = await supabase
        .from("organization_invites")
        .select("id, email, role, token, expires_at, accepted_at")
        .eq("organization_id", workspaceId)
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      setInvites((inv as InviteRow[]) ?? []);
    } else {
      setInvites([]);
    }
  }, [isWorkspaceAdmin, supabase, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addMember = async () => {
    if (!workspaceId || !email.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("add_or_invite_organization_member", {
        p_org_id: workspaceId,
        p_email: email.trim(),
        p_role: role,
      });
      if (error) throw error;
      const result = (data ?? {}) as AddResult;

      if (result.status === "added") {
        toastSuccess("Membre ajouté à l’espace");
      } else if (result.status === "invited" && result.token) {
        const link = `${getPublicAppOrigin()}/invite/${result.token}`;
        try {
          await navigator.clipboard.writeText(link);
          toastSuccess("Invitation créée — lien copié");
        } catch {
          toastSuccess(`Invitation créée : ${link}`);
        }
      } else {
        toastSuccess("Invitation créée");
      }
      setEmail("");
      await load();
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!workspaceId) return null;

  return (
    <section className="ui-surface space-y-4 rounded-2xl p-5">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
          Espace
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[var(--foreground)]">
          Membres — {workspace?.name}
        </h2>
        <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
          Ajoutez un collègue @idena.fr à cet espace. S’il a déjà un compte, il y a accès
          immédiatement ; sinon un lien d’invitation est généré.
        </p>
      </header>

      <ul className="divide-y divide-[var(--line)]/70 rounded-xl border border-[var(--line)]">
        {members.map((m) => (
          <li
            key={m.user_id}
            className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
          >
            <span className="font-medium text-[var(--foreground)]">
              {m.display_name ?? m.user_id.slice(0, 8)}
            </span>
            <span className="text-[11px] uppercase tracking-wide text-[color:var(--foreground)]/45">
              {m.role}
            </span>
          </li>
        ))}
        {members.length === 0 ? (
          <li className="px-3 py-3 text-sm text-[color:var(--foreground)]/50">Aucun membre</li>
        ) : null}
      </ul>

      {isWorkspaceAdmin ? (
        <div className="space-y-3 border-t border-[var(--line)]/70 pt-4">
          <p className="text-sm font-medium text-[var(--foreground)]">Ajouter quelqu’un</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addMember();
                }
              }}
              placeholder="prenom.nom@idena.fr"
              className="ui-input flex-1"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "member" | "admin")}
              className="ui-input sm:w-36"
            >
              <option value="member">Membre</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="button"
              disabled={busy || !email.trim()}
              onClick={() => void addMember()}
              className="ui-btn ui-btn-primary"
            >
              <UserPlus className="h-4 w-4" aria-hidden />
              Ajouter
            </button>
          </div>

          {invites.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--foreground)]/45">
                Invitations en attente
              </p>
              <ul className="space-y-2">
                {invites.map((inv) => {
                  const link = `${getPublicAppOrigin()}/invite/${inv.token}`;
                  return (
                    <li
                      key={inv.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--surface-soft)] px-3 py-2 text-sm"
                    >
                      <span>
                        {inv.email}{" "}
                        <span className="text-[color:var(--foreground)]/45">({inv.role})</span>
                      </span>
                      <button
                        type="button"
                        className="ui-btn ui-btn-ghost h-8 text-xs"
                        onClick={() => {
                          void navigator.clipboard.writeText(link).then(
                            () => toastSuccess("Lien copié"),
                            () => toastError("Copie impossible"),
                          );
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" aria-hidden />
                        Copier le lien
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-[color:var(--foreground)]/50">
          Seuls les admins / owners de l&apos;espace peuvent ajouter des membres.
        </p>
      )}
    </section>
  );
}
