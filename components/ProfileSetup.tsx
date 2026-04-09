"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, UserCircle2 } from "lucide-react";
import { getSupabaseBrowser } from "../lib/supabaseBrowser";
import AdminAvatar from "./AdminAvatar";
import type { AdminId } from "../lib/types";

type TeamMember = {
  id: string;
  display_name: string;
  is_active: boolean;
};

export default function ProfileSetup(props: {
  userId: string;
  onComplete: () => void;
}) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = getSupabaseBrowser();

  useEffect(() => {
    supabase
      .from("team_members")
      .select("id, display_name, is_active")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }: { data: TeamMember[] | null }) => {
        setMembers(data ?? []);
      })
      .catch(() => {
        setError("Impossible de charger les collaborateurs.");
      });
  }, [supabase]);

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    setError(null);

    const member = members.find((m) => m.id === selected);
    if (!member) return;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        team_member_id: selected,
        display_name: member.display_name,
      })
      .eq("id", props.userId);

    if (updateError) {
      setError("Impossible de sauvegarder votre profil. Réessayez.");
      setSaving(false);
      return;
    }

    props.onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-lg">
        {/* En-tête */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-[0_8px_24px_rgba(20,17,13,0.1)]">
            <UserCircle2 className="h-8 w-8 text-[color:var(--foreground)]/50" />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--foreground)]/50">
            Bienvenue
          </p>
          <h1 className="ui-heading mt-1 text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            Qui êtes-vous ?
          </h1>
          <p className="mt-2 text-sm text-[color:var(--foreground)]/60">
            Sélectionnez votre profil pour personnaliser votre espace de travail. Cette action ne sera demandée qu&apos;une seule fois.
          </p>
        </div>

        {/* Liste des membres */}
        <div className="ui-surface rounded-2xl p-4">
          {members.length === 0 && !error && (
            <p className="py-6 text-center text-sm text-[color:var(--foreground)]/50">
              Chargement des collaborateurs...
            </p>
          )}

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {members.map((member) => {
              const isSelected = selected === member.id;
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setSelected(member.id)}
                  className={[
                    "relative flex flex-col items-center gap-3 rounded-2xl border p-5 text-center transition-all",
                    isSelected
                      ? "border-[var(--line-strong)] bg-[var(--surface-soft)] shadow-[0_0_0_3px_rgba(26,26,26,0.12)]"
                      : "border-[var(--line)] bg-[var(--surface-soft)] hover:border-[var(--line-strong)] hover:bg-[var(--surface)]",
                  ].join(" ")}
                >
                  <AdminAvatar admin={member.display_name as AdminId} size="md" />
                  <span
                    className={[
                      "text-sm font-semibold",
                      isSelected
                        ? "text-[color:var(--foreground)]/75"
                        : "text-[var(--foreground)]",
                    ].join(" ")}
                  >
                    {member.display_name}
                  </span>
                  {isSelected && (
                    <span className="absolute right-2 top-2">
                      <CheckCircle2 className="h-5 w-5 text-[color:var(--foreground)]/50" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!selected || saving}
            className={[
              "ui-transition mt-4 w-full rounded-xl py-3 text-sm font-semibold transition",
              selected
                ? "bg-[var(--accent)] text-[#fffdf9] shadow-[0_14px_30px_rgba(20,17,13,0.18)] hover:-translate-y-0.5 hover:bg-[var(--accent-strong)]"
                : "cursor-not-allowed bg-[var(--surface-soft)] text-[color:var(--foreground)]/40",
            ].join(" ")}
          >
            {saving ? "Enregistrement..." : "Confirmer mon identité"}
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] text-[color:var(--foreground)]/40">
          Vous pourrez modifier ce choix dans les Paramètres.
        </p>
      </div>
    </div>
  );
}
