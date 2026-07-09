"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import V2AppShell from "../../v2/AppShell";
import { useCurrentUser } from "../../../lib/useCurrentUser";

export default function SurveyAdminGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useCurrentUser();
  const isAdmin = Boolean(user?.isAdmin);

  return (
    <V2AppShell
      currentUserName={user?.teamMemberName ?? user?.displayName ?? undefined}
      currentUserEmail={user?.email}
      currentUserAvatarUrl={user?.avatarUrl}
      currentUserJobTitle={user?.jobTitle}
    >
      {loading ? (
        <p className="text-sm text-[color:var(--foreground)]/55">Chargement…</p>
      ) : isAdmin ? (
        children
      ) : (
        <div className="ui-surface mx-auto max-w-md rounded-2xl p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-soft)] text-[var(--accent)]">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="ui-heading text-xl font-semibold text-[var(--foreground)]">
            Accès réservé à l&apos;administrateur
          </h1>
          <p className="mt-2 text-sm text-[color:var(--foreground)]/60">
            La gestion des questionnaires est réservée à l&apos;administrateur.
          </p>
          <Link href="/v2/dashboard/kanban" className="ui-btn ui-btn-secondary mt-6 inline-flex">
            Retour au tableau de bord
          </Link>
        </div>
      )}
    </V2AppShell>
  );
}
