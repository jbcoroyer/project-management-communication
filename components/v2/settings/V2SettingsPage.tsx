"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Home,
  Palette,
  Smile,
  UsersRound,
} from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import AdminSettingsPanel from "../../settings/AdminSettingsPanel";
import WorkspaceMembersPanel from "../../settings/WorkspaceMembersPanel";
import WorkspaceModulesPanel from "../../settings/WorkspaceModulesPanel";
import WorkspaceServicesPanel from "../../settings/WorkspaceServicesPanel";
import OrgLabelsPanel from "../../settings/OrgLabelsPanel";
import DeleteAccountPanel from "../../settings/DeleteAccountPanel";
import DesktopStartupPanel from "../../settings/DesktopStartupPanel";
import UiThemePanel from "../../settings/UiThemePanel";
import V2PageHeader from "../V2PageHeader";

type SettingsIntent = "me" | "look" | "team" | "space" | "lists";

const INTENTS: {
  id: SettingsIntent;
  title: string;
  blurb: string;
  hint: string;
  icon: typeof Smile;
  accent: string;
}[] = [
  {
    id: "me",
    title: "Mon coin",
    blurb: "Profil, agenda, app bureau et zone sensible.",
    hint: "Ce qui ne concerne que vous",
    icon: Smile,
    accent: "from-[#ffe8c8] to-[#ffd4a8]",
  },
  {
    id: "look",
    title: "Apparence",
    blurb: "Cinq thèmes : typo, couleurs, coins, boutons.",
    hint: "Changez le look de Tuesday",
    icon: Palette,
    accent: "from-[#fff3c4] to-[#ffe08a]",
  },
  {
    id: "team",
    title: "L’équipe",
    blurb: "Comptes d’accès et personnes assignables.",
    hint: "Qui peut entrer · qui apparaît sur les tâches",
    icon: UsersRound,
    accent: "from-[#d8f0ff] to-[#b8e0f8]",
  },
  {
    id: "space",
    title: "L’espace",
    blurb: "Modules, rattachements et vocabulaire.",
    hint: "Comment Tuesday parle et se présente",
    icon: Home,
    accent: "from-[#e2f5d8] to-[#c8e8b4]",
  },
  {
    id: "lists",
    title: "Les listes",
    blurb: "Sociétés, domaines, colonnes — et un mot sur l’archivage.",
    hint: "Les menus déroulants du quotidien",
    icon: BookOpen,
    accent: "from-[#ffe0d6] to-[#ffc8b4]",
  },
];

function intentFromSearch(outlook: string | null): SettingsIntent | null {
  if (outlook) return "me";
  return null;
}

export default function V2SettingsPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isModernUi = pathname.startsWith("/v2") || pathname.startsWith("/v3");
  const outlookParam = searchParams.get("outlook");

  const [intent, setIntent] = useState<SettingsIntent | null>(() =>
    intentFromSearch(outlookParam),
  );

  useEffect(() => {
    if (outlookParam) setIntent("me");
  }, [outlookParam]);

  const active = useMemo(
    () => INTENTS.find((i) => i.id === intent) ?? null,
    [intent],
  );

  return (
    <div className="space-y-6">
      <section className="space-y-5">
        {isModernUi ? (
          <V2PageHeader
            kicker="Outils"
            title="Réglages"
            description="Cinq portes, pas un interminable formulaire. Choisissez ce que vous voulez régler."
          />
        ) : (
          <header className="ui-surface rounded-2xl border-l-4 border-l-[var(--accent)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              Paramètres
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Réglages</h1>
            <p className="mt-1 text-sm text-[color:var(--foreground)]/55">
              Cinq portes, pas un interminable formulaire. Choisissez ce que vous voulez régler.
            </p>
          </header>
        )}
      </section>

      {!active ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INTENTS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setIntent(item.id)}
                className="group ui-surface relative overflow-hidden rounded-2xl p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(20,17,13,0.08)]"
              >
                <div
                  className={`pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-gradient-to-br ${item.accent} opacity-70 transition group-hover:scale-110`}
                  aria-hidden
                />
                <div className="relative flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
                    <Icon className="h-5 w-5 text-[var(--foreground)]" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/45">
                      {item.hint}
                    </p>
                    <h2 className="mt-0.5 text-lg font-semibold text-[var(--foreground)]">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-sm text-[color:var(--foreground)]/60">{item.blurb}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIntent(null)}
              className="ui-btn inline-flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Toutes les portes
            </button>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)]/45">
                {active.hint}
              </p>
              <h2 className="text-xl font-semibold text-[var(--foreground)]">{active.title}</h2>
            </div>
          </div>

          <nav
            className="flex flex-wrap gap-2"
            aria-label="Raccourcis des réglages"
          >
            {INTENTS.map((item) => {
              const selected = item.id === intent;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIntent(item.id)}
                  className={[
                    "rounded-xl border px-3 py-1.5 text-xs font-semibold transition",
                    selected
                      ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--accent-contrast)]"
                      : "border-[var(--line)] bg-[var(--surface)] text-[color:var(--foreground)]/70 hover:bg-[var(--surface-soft)]",
                  ].join(" ")}
                >
                  {item.title}
                </button>
              );
            })}
          </nav>

          {intent === "me" && (
            <div className="space-y-5">
              <DesktopStartupPanel />
              <AdminSettingsPanel hideChrome sections={["profile", "outlook"]} />
              <DeleteAccountPanel />
            </div>
          )}

          {intent === "look" && (
            <div className="space-y-5">
              <UiThemePanel />
            </div>
          )}

          {intent === "team" && (
            <div className="space-y-5">
              <p className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)]/60 px-4 py-3 text-sm text-[color:var(--foreground)]/65">
                <strong className="font-semibold text-[var(--foreground)]">Astuce :</strong>{" "}
                <em>Membres</em> = qui se connecte à l’espace.{" "}
                <em>Collaborateurs</em> = qui peut être assigné sur une tâche.
              </p>
              <WorkspaceMembersPanel />
              <AdminSettingsPanel hideChrome sections={["collaborators"]} />
            </div>
          )}

          {intent === "space" && (
            <div className="space-y-5">
              <WorkspaceModulesPanel />
              <WorkspaceServicesPanel />
              <OrgLabelsPanel />
              <AdminSettingsPanel hideChrome sections={["identity"]} />
            </div>
          )}

          {intent === "lists" && (
            <div className="space-y-5">
              <AdminSettingsPanel
                hideChrome
                sections={["companies", "domains", "columns", "archive"]}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
