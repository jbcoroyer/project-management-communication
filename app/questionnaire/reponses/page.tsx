"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import V2AppShell from "../../../components/v2/AppShell";
import SurveyResponsesWorkspace from "../../../components/survey/responses/SurveyResponsesWorkspace";
import { useCurrentUser } from "../../../lib/useCurrentUser";

export default function SurveyResponsesPage() {
  const { user, loading } = useCurrentUser();
  // Garde UI : la vraie barrière est la RLS (un non-membre ne reçoit aucune ligne).
  const isCommMember = Boolean(user?.teamMemberId);

  return (
    <V2AppShell
      currentUserName={user?.teamMemberName ?? user?.displayName ?? undefined}
      currentUserEmail={user?.email}
      currentUserAvatarUrl={user?.avatarUrl}
      currentUserJobTitle={user?.jobTitle}
    >
      {loading ? (
        <p className="text-sm text-[color:var(--foreground)]/55">Chargement…</p>
      ) : isCommMember ? (
        <SurveyResponsesWorkspace />
      ) : (
        <div className="ui-surface mx-auto max-w-md rounded-2xl p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-soft)] text-[var(--accent)]">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="ui-heading text-xl font-semibold text-[var(--foreground)]">
            Accès réservé au service Communication
          </h1>
          <p className="mt-2 text-sm text-[color:var(--foreground)]/60">
            Cette page présente les réponses au questionnaire de satisfaction. Elle est réservée aux
            membres du service Communication.
          </p>
          <Link href="/v2/dashboard/kanban" className="ui-btn ui-btn-secondary mt-6 inline-flex">
            Retour au tableau de bord
          </Link>
        </div>
      )}
    </V2AppShell>
  );
}
